import '@fontsource-variable/space-grotesk/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('missing root element');

createRoot(container).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
