import React, {useState} from "react";
import {useParams, NavLink, withRouter} from "react-router-dom";
import PageTitle from "./../../common/PageTitle";
import PageSubtitle from "./../../common/PageSubtitle";
import Job from "./../../common/Job";
import PerformanceTest from "./../../common/Job/PerformanceTest";
import * as Icon from "react-feather";
import SingleProjectMenu from "./../SingleProject/SingleProjectMenu";
import {BreadcrumbsItem} from 'react-breadcrumbs-dynamic'
import {Button} from 'reactstrap';
import MonacoEditor from 'react-monaco-editor';
import {connect} from "react-redux";
import {
  updatePerfJobContents,
  storeNewPerformanceTest
} from "../../../redux/project/actions";

class ManagePerformanceTestPage extends React.Component {
  constructor(props) {
    super(props)
  }

  handleCreateTest() {
    const { id: projectId } = this.props.match.params;
    const { managePerfTestContents: testContents } = this.props.project;
    
    // TODO: Validate the test contents.
    if (!testContents) {
      alert(`Please make sure to update the sample test!`);

      return;
    }
    
    this.props.storeNewPerformanceTest(testContents, projectId)
    setTimeout(() => {
      this.props.history.push(`/projects/${projectId}/performance`)
    }, 300)
  }

  render() {
    const starterCode = `name: 
version: 1.0
description: A sample test
engine: autocannon
type: perfRun
resources:
  agents: 1
  cpu: 0
  memory: 512Mi
config:
  url: http://httpbin.org/header
  headers:
    host: mock.host.org
  connectionRate: 
  duration: `;

    const id = this.props.match.params.id;
    const project = this.props.project.currentProject;
    
    // TODO: Check whether the project instance is loaded, otherwise get it from the server using the provided ID.
    const projectName = project && project.instance && project.instance.name || "Project";

    return (
      <div>
        <BreadcrumbsItem to='/'>Home</BreadcrumbsItem>
        <BreadcrumbsItem to='/projects'>Projects</BreadcrumbsItem>
        <BreadcrumbsItem to={`/projects/{$id}`}>{projectName} / Performance</BreadcrumbsItem>
  
        <div className="mb-1 d-flex">
          <PageTitle>
            {projectName}
            <PageSubtitle>New Performance Test</PageSubtitle>
          </PageTitle>
  
          <SingleProjectMenu>
            <NavLink to={`/projects/${id}/performance`}>
              <Icon.Zap/>
              Performance
            </NavLink>
            <NavLink to={`/projects/${id}/functional`}>
              <Icon.Box/>
              Functional
            </NavLink>
          </SingleProjectMenu>
        </div>
  
        <div className="container">
          <div className="row px-0 pt-3">
            <div className="card box-shadow" style={{borderRadius: 10, overflow: "hidden"}}>
              <div className="card-body p-0">
                <MonacoEditor
                  width="5000"
                  height="500"
                  language="yaml"
                  theme="vs-light"
                  value={this.props.project.managePerfTestContents || starterCode}
                  onChange={this.props.updatePerfJobContents}
                  options={{
                    selectOnLineNumbers: true,
                    minimap: {
                      enabled: false
                    },
                    fontSize: 15,
                    automaticLayout: true
                  }}/>
              </div>
            </div>
            <Button className="py-1 mt-4" color="primary" onClick={this.handleCreateTest.bind(this)}>Create Test</Button>
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    project: state.project
  }
}

const mapDispatchToProps = dispatch => {
  return {
    updatePerfJobContents: (content) => dispatch(updatePerfJobContents(content)),
    storeNewPerformanceTest: (testData, projectId) => dispatch(storeNewPerformanceTest(testData, projectId))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ManagePerformanceTestPage));
