import './index.css';
import './styles/global.css';
import RoutesConfig from "./routes";
import { ThemeProvider } from "./context/ThemeContext";
import GlobalNav from "./components/GlobalNav";
import GlobalAIPanel from "./components/GlobalAIPanel";

function App() {
  return (
    <ThemeProvider>
      <GlobalNav />
      <GlobalAIPanel />
      <RoutesConfig />
    </ThemeProvider>
  );
}

export default App;
