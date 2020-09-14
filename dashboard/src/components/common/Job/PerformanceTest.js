import React from "react";
import * as Icon from "react-feather";
import moment from "moment";
import {NavLink, withRouter} from "react-router-dom";
import { Button } from 'reactstrap';

import './style.scss';

class PerformanceTest extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { id: projectId } = this.props.match.params;
    const { test } = this.props;
    const { requests, connectionRate, connections } = test.config.config;

    // Parse requests types.
    let reqTypes = "1 req. type";

    if (requests && requests.length > 1) {
      reqTypes = `${test.config.config.requests.length} req. types`;
    }

    // Parse RPS / Connections
    let rpsCount = "∞"

    if (connectionRate) {
      rpsCount = `${connectionRate} RPS / Agent`
    }

    if (connections) {
      rpsCount = `${connections} Connections`;
    }

    // Parse Agents Count
    const { agents } = test.config.resources;
    let agentsCount = `${agents || '-'} Agent${agents > 1 ? "s" : ""}`

    return (
      <div className="perf-test job card box-shadow px-0 col-12 mb-3  ">
        <div className="card-body d-flex flex-row p-3">
          <div className="perf-test__name">
            <NavLink to={`/projects/${projectId}/performance/${test._id}`}>{test.config.name || "-"}</NavLink>
          </div>
  
          <div className="perf-test__agents">
            <Icon.Server/>
            {agentsCount}
          </div>
  
          <div className="perf-test__rps">
            <Icon.Zap/>
            {rpsCount}
          </div>
  
          <div className="perf-test__reqtypes">
            <Icon.Layers/>
            {reqTypes}
          </div>
  
          <div className="perf-test__lastrun">
            <Icon.Calendar/>
            {moment(test.updatedAt).fromNow()}
          </div>
  
          <div className="job__duration">
            <Icon.Clock/>
            {moment.utc(test.config.config.duration * 1000).format('mm:ss')}
          </div>
  
          <div className="ml-auto d-flex">          
            <Button color="secondary" outline size="sm" className="ml-2">
              <NavLink to={`/projects/${projectId}/performance/${test._id}`}>{"View Test"}</NavLink>
            </Button>
          </div>
  
        </div>
      </div>
    )
  }
}

export default withRouter(PerformanceTest);