import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import './App.css';
import routes from './routes';

function App() {
    const element = useRoutes(routes);
    return <Suspense fallback={<div>Loading...</div>}>{element}</Suspense>;
}

export default App;
