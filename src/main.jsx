import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './app/App.jsx';

import './i18n/index.jsx';

import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';

import './styles/reset.css';
import './styles/variables.css';
import './styles/typography.css';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);