import React from "react";
import {NavLink} from "react-router-dom";
import * as Icon from 'react-feather';
import {NavItem} from "reactstrap";
import {Breadcrumbs} from 'react-breadcrumbs-dynamic';
import LoadingBar from 'react-redux-loading-bar';

import "./style.scss";

class MainHeader extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <LoadingBar />
        <nav
          className="navbar navbar-expand-md fixed-top navbar-dark"
          style={{
          backgroundColor: "#000"
        }}>
          <div className="container">
            <NavLink to="/" className="navbar-brand" href="#">👸🏼 Athena</NavLink>

            <button
              className="navbar-toggler p-0 border-0"
              type="button"
              data-toggle="offcanvas">
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="navbar-collapse offcanvas-collapse" id="navbarsExampleDefault">
              <ul className="navbar-nav mr-auto">
                <NavItem>
                  <NavLink className="nav-link" to="/projects">Projects</NavLink>
                </NavItem>

                <NavItem>
                  <NavLink className="nav-link" to="/status">Status</NavLink>
                </NavItem>
              </ul>
            </div>

            <ul className="navbar-nav">
              <NavItem>
                <NavLink className="nav-link" to="/settings"><Icon.Settings/></NavLink>
              </NavItem>
            </ul>
          </div>
        </nav>
        <div className="nav-scroller bg-white box-shadow d-flex align-items-center">
          <div className="container">
            <div className="row px-3">
              <div className="breadcrumbs">
                <Breadcrumbs
                  separator={< b > / </b >}
                  item={NavLink}
                  finalItem={'b'}
                  finalProps={{
                  style: {
                    color: 'black'
                  }
                }}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default MainHeader