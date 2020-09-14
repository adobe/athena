import React from 'react';
import './styles/main.scss';
import {BrowserRouter as Router, Switch, Route} from "react-router-dom";
import MainHeader from "./components/common/MainHeader";

// Pages
import ProjectsPage from "./components/pages/Projects";
import SingleProjectPage from "./components/pages/SingleProject";
import PerformanceTestsPage from "./components/pages/PerformanceTests";
import FunctionalTestsPage from "./components/pages/FunctionalTests";
import ProjectSettingsPage from "./components/pages/ProjectSettingsPage";
import SettingsPage from "./components/pages/Settings";
import StatusPage from "./components/pages/Status";
import HomePage from "./components/pages/Home";
import ManagePerformanceTest from "./components/pages/ManagePerformanceTest";
import EditPerformanceTest from "./components/pages/EditPerformanceTest";
import SinglePerformanceTest from './components/pages/SinglePerformanceTest';

function App() {
  return (
    <Router>
      <div className="bg-light">
        <MainHeader/>

        <main role="main" className="container py-4">
          <Switch>
            <Route path="/projects/:id/performance/edit/:testId" children={<EditPerformanceTest/>}/>
            <Route path="/projects/:id/performance/new" children={<ManagePerformanceTest/>}/>
            <Route path="/projects/:id/performance/:testId" children={<SinglePerformanceTest/>}/>
            <Route path="/projects/:id/performance" children={<PerformanceTestsPage/>}/>
            <Route path="/projects/:id/functional" children={<FunctionalTestsPage/>}/>
            

            <Route path="/status" children={<StatusPage/>}/>

            
            <Route path="/projects/:id/settings" children={<ProjectSettingsPage/>}/>
            <Route path="/projects" children={<ProjectsPage/>}/>              
            <Route path="/settings" children={<SettingsPage/>}/>              
            
            <Route path="/" children={<ProjectsPage/>}/>
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;