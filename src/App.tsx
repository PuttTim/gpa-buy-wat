import React from "react"
import { Route, Routes } from "react-router-dom"
import Calculator from "./pages/Calculator"

const App = () => {
    return (
        <>
            <div className="max-w-[1500px] m-auto">
                <Routes>
                    <Route path="/" element={<Calculator />} />
                </Routes>
            </div>
        </>
    )
}

export default App
