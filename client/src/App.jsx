import { useEffect } from 'react';
import './index.css';
import './styles/global.css';
import RoutesConfig from "./routes";
import { ThemeProvider } from "./context/ThemeContext";
import GlobalAIPanel from "./components/GlobalAIPanel";

function App() {
  useEffect(() => {
    // Prevent the browser from opening dropped files globally if the user misses the drop zone
    const preventDefault = (e) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  return (
    <ThemeProvider>
      <GlobalAIPanel />
      <RoutesConfig />
    </ThemeProvider>
  );
}

export default App;
