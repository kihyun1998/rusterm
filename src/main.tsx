import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@/hooks/use-theme';
import App from './App';
import './globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ThemeProvider defaultTheme="light">
    <App />
  </ThemeProvider>
);
