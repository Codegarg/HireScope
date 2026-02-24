import './index.css';
import RoutesConfig from "./routes";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <RoutesConfig />
    </ThemeProvider>
  );
}

export default App;
