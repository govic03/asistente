import React, { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import Sidebar from "./components/SideBar";
import MainPage from "./components/MainPage";
import './App.css';
import { ToastContainer } from "react-toastify";
import ExploreCustomChats from "./components/ExploreCustomChats";
import CustomChatEditor from './components/CustomChatEditor';

const withNombreCursoCapture = (WrappedComponent) => {
  return (props) => {
    const location = useLocation();
    const [nombre, setNombre] = useState<string | null>(null);
    const [curso, setCurso] = useState<string | null>(null);

    useEffect(() => {
      console.log("URL de búsqueda completa:", location.search);
      const searchParams = new URLSearchParams(location.search);
      const nombreParam = searchParams.get('nombre');
      const cursoParam = searchParams.get('curso');

      // Actualiza solo si hay cambios
      if (nombreParam && nombreParam !== nombre) {
        setNombre(nombreParam);
        console.log("Nombre capturado de la URL:", nombreParam);
      }

      if (cursoParam && cursoParam !== curso) {
        setCurso(cursoParam);
        console.log("Curso capturado de la URL:", cursoParam);
      }

      if (nombreParam || cursoParam) {
        const updatedSearchParams = new URLSearchParams(location.search);
        updatedSearchParams.delete('nombre');
        updatedSearchParams.delete('curso');
        const newUrl = `${location.pathname}${updatedSearchParams.toString() ? `?${updatedSearchParams.toString()}` : ''}`;
        if (location.search !== newUrl) {
          window.history.replaceState({}, '', newUrl);
        }
      }
    }, [location, nombre, curso]);

    return <WrappedComponent {...props} nombre={nombre} curso={curso} />;
  };
};



const App = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  interface MainPageProps {
    className: string;
    isSidebarCollapsed: boolean;
    toggleSidebarCollapse: () => void;
    nombre?: string | null;
    curso?: string | null;
  }

  const MainPageWithProps: React.FC<Partial<MainPageProps>> = (props) => (
    <MainPage
      className={'main-content'}
      isSidebarCollapsed={isSidebarCollapsed}
      toggleSidebarCollapse={toggleSidebarCollapse}
      {...props}
    />
  );

  const MainPageWithNombreCurso = withNombreCursoCapture(MainPageWithProps);

  return (
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <div className="App dark:bg-gray-900 dark:text-gray-100">
          <ToastContainer />
          <div className="flex overflow-hidden w-full h-full relative z-0">
            <Sidebar
              className="sidebar-container flex-shrink-0"
              isSidebarCollapsed={isSidebarCollapsed}
              toggleSidebarCollapse={toggleSidebarCollapse}
            />
            <div className="flex-grow h-full overflow-hidden">
              <Routes>
                <Route path="/" element={<MainPageWithNombreCurso />} />
                <Route path="/c/:id" element={<MainPageWithNombreCurso />} />
                <Route path="/explore" element={<ExploreCustomChats />} />
                <Route path="/g/:gid" element={<MainPageWithNombreCurso />} />
                <Route path="/g/:gid/c/:id" element={<MainPageWithNombreCurso />} />
                <Route path="/custom/editor" element={<CustomChatEditor />} />
                <Route path="/custom/editor/:id" element={<CustomChatEditor />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </div>
      </I18nextProvider>
    </BrowserRouter>
  );
};

export default App;
