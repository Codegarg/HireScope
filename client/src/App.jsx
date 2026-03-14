import './index.css';
import './styles/global.css';
import RoutesConfig from "./routes";
import { ThemeProvider } from "./context/ThemeContext";
import GlobalAIPanel from "./components/GlobalAIPanel";

function App() {
  return (
    <ThemeProvider>
      <GlobalAIPanel />
      <RoutesConfig />
    </ThemeProvider>
  );
}

export default App;
