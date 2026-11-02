import { lazy } from "react";

const Home = lazy(() => import('@/pages/Home'));
const ThreeUIOne = lazy(() => import('@/pages/ThreeOne'));
const CanvasUIOne = lazy(() => import('@/pages/CanvasUIOne'));
const WebGLOne = lazy(() => import('@/pages/WebGLOne'));

const routes = [
    { path: '/', element: <Home /> },
    { path: '/threeUIOne', element: <ThreeUIOne /> },
    { path: '/canvasUIOne', element: <CanvasUIOne /> },
    { path: '/webGLOne', element: <WebGLOne /> },
];

export default routes;