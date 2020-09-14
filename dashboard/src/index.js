// External
import React from 'react';
import ReactDOM from     'react-dom';
import {ThroughProvider} from 'react-through'
import {Provider as ReduxProvider} from 'react-redux';

// Local
import App from './App';
import * as serviceWorker from './serviceWorker';
import store from './redux/store';

// Styles 
import './index.css';

const MainApp = (
  <ThroughProvider>
    <ReduxProvider store={store}>
      <App/>
    </ReduxProvider>
  </ThroughProvider>
)

ReactDOM.render(MainApp, document.getElementById('root'));

serviceWorker.unregister();
