import RoutesConfig from "./routes";

function App() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

        :root {
            --bg-deep: #030014;
            --primary: #7c3aed;
            --primary-light: #a78bfa;
            --primary-dark: #5b21b6;
            --secondary: #4f46e5;
            --accent: #f59e0b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            --radius-premium: 1.5rem;
            --font-heading: 'Outfit', sans-serif;
            --font-body: 'Inter', sans-serif;
        }

        body {
            background-color: var(--bg-deep);
            color: var(--text-main);
            font-family: var(--font-body);
            margin: 0;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }

        * {
            box-sizing: border-box;
        }

        .gradient-text {
            background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        @media print {
            body { background: white !important; color: black !important; }
            .no-print { display: none !important; }
        }
      `}</style>
      <RoutesConfig />
    </>
  );
}

export default App;
