/**
 * Repeatable browser E2E check. Paste this entire file into DevTools on the
 * calculator (prefer an isolated/incognito tab). It uses the rendered controls,
 * resets each system through Start over, and returns a JSON report. No imports,
 * direct application-function calls, or test-only product hooks are required.
 * It replaces calculator data in this browser tab's storage; use a fresh profile.
 */
(async () => {
    const results = []
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const check = (name, actual, expected) => {
        results.push({ name, actual, expected, passed: actual === expected })
        if (actual !== expected) throw new Error(`${name}: expected ${expected}, got ${actual}`)
    }
    const click = async label => {
        const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label)
        if (!button) throw new Error(`Missing button: ${label}`)
        // Radix tabs activate on primary mousedown, matching a real pointer.
        button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
        button.click()
        await settle()
    }
    const set = async (id, value) => {
        const element = document.getElementById(id)
        if (!element) throw new Error(`Missing field: ${id}`)
        const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value)
        element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
        await settle()
    }
    const gpa = () => {
        const section = document.querySelector('[aria-label="Receipt"]')
        return [...section.querySelectorAll('span')].find(el => el.textContent === 'Total GPA').nextElementSibling.textContent
    }
    const semesterGPA = () => document.querySelector('[data-slot="accordion-trigger"] span.font-mono').textContent
    try {
        for (const [school, ungraded, numeric, expected] of [
            ['NUS', ['S', 'U', 'CS', 'CU'], '5', '5.00'],
            ['NTU', ['P', 'NR', 'LOA', 'ungraded-fail', 'S', 'U'], '5', '5.00'],
            ['Poly', ['UP', 'UF'], '4', '4.00'],
            ['SMU', ['P', 'ungraded-fail'], '4.3', '4.00'],
        ]) {
            await click(school)
            await click('Start over')
            await click('Clear')
            await set('s0-m0-grade', numeric)
            check(`${school}: numeric grade`, gpa(), expected)
            if (school === 'SMU') check('SMU: semester keeps A+ points', semesterGPA(), '4.30')
            for (const grade of ungraded) {
                await set('s0-m0-grade', grade)
                check(`${school}: ${grade} selected`, document.getElementById('s0-m0-grade').value, grade)
                check(`${school}: all ${grade} has no GPA`, gpa(), '-')
                await set('current-gpa', school === 'SMU' || school === 'Poly' ? '3' : '4')
                await set('total-credits', '20')
                check(`${school}: ${grade} leaves prior GPA intact`, gpa(), school === 'SMU' || school === 'Poly' ? '3.00' : '4.00')
                await set('current-gpa', '')
                await set('total-credits', '')
            }
            await set('s0-m0-grade', numeric)
            await click('Add module')
            await set('s0-m1-grade', ungraded[0])
            check(`${school}: ungraded credits excluded from denominator`, gpa(), expected)
            await set('s0-m1-grade', '0')
            check(`${school}: ordinary F counts`, gpa(), school === 'SMU' ? '2.15' : school === 'Poly' ? '2.00' : '2.50')
            await set('s0-m1-grade', ungraded[0])
        }
        await set('s0-m1-grade', '3.3')
        check('SMU: A+ is weighted at 4.3 before cumulative cap', gpa(), '3.80')
        await set('s0-m1-grade', '4.3')
        check('SMU: cumulative caps at 4.00', gpa(), '4.00')
        await set('current-gpa', '4.3')
        check('SMU: prior GPA input capped at 4.00', document.getElementById('current-gpa').value, '4')
        await set('current-gpa', '')
        await set('s0-m1-grade', 'P')
        await click('Add semester')
        await set('s1-m0-grade', '3.3')
        check('SMU: GPA across semesters excludes Pass', gpa(), '3.80')
        check('No horizontal overflow', document.documentElement.scrollWidth <= innerWidth, true)
        check('Food images loaded', [...document.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0), true)
        const stored = JSON.parse(localStorage.getItem('gpa-buy-wat:v1'))
        check('Pass saved without numeric coercion', stored.systems[3].semesters[0].modules[1].grade, 'P')
        await click('NUS')
        check('Switching systems retains ungraded result', document.getElementById('s0-m1-grade').value, 'S')
        await click('SMU')
        check('Switching back retains weighted GPA', gpa(), '3.80')
        check('Grading explanation hidden by default', document.querySelector('[role="dialog"]'), null)
        document.querySelector('[aria-label="Grading help"]').click()
        await settle()
        check('Help icon opens SMU explanation', document.querySelector('[role="dialog"]').textContent.includes('4.00'), true)
        document.querySelector('[aria-label="Grading help"]').click()
        await settle()
    } catch (error) {
        results.push({ name: 'E2E failure', passed: false, error: String(error) })
    }
    const report = { url: location.href, checkedAt: new Date().toISOString(), viewport: { width: innerWidth, height: innerHeight }, passed: results.every(result => result.passed), results }
    window.__gradingE2E = report
    return report
})()
