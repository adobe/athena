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

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls. Learn
// more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
