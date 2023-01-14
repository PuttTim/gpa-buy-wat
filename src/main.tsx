import { ChakraProvider } from "@chakra-ui/react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./index.css"
import '@fontsource/dm-sans'
import '@fontsource/poppins'
import theme from "./Theme"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <ChakraProvider theme={theme}>
      <BrowserRouter>
          <App />
      </BrowserRouter>
    </ChakraProvider>,
)
