import React from "react";
import {NavLink, withRouter} from "react-router-dom";
import PageTitle from "./../../common/PageTitle";
import PageSubtitle from "./../../common/PageSubtitle";
import * as Icon from "react-feather";
import SingleProjectMenu from "./../SingleProject/SingleProjectMenu";
import {BreadcrumbsItem} from 'react-breadcrumbs-dynamic'
import {Button} from 'reactstrap';
import MonacoEditor from 'react-monaco-editor';
import {connect} from "react-redux";
import jsyaml from "js-yaml";
import {
  updatePerfJobContents,
  storeNewPerformanceTest,
  fetchPerfTestDetails,
  fetchSinglePerfTestDetails,
  updatePerformanceTest
} from "../../../redux/project/actions";

class EditPerformanceTest extends React.Component {
  constructor(props) {
    super(props)
  }

  componentWillMount() {
    const {id: projectId, testId } = this.props.match.params;
    this.props.fetchSinglePerfTestDetails(projectId, testId);
  }

  handleEditTest() {
    const { id: projectId, testId } = this.props.match.params;
    this.props.updatePerformanceTest(
      projectId,
      testId,
      jsyaml.safeLoad(this.props.project.managePerfTestContents), // TODO: Check for errors.
      function () { 
        this.props.history.push(`/projects/${projectId}/performance/${testId}`)
      }.bind(this)
    )
  }

  render() {
    const id = this.props.match.params.id;
    const project = this.props.project.currentProject;    
    const projectName = project && project.instance && project.instance.name || "Project";

    return (
      <div>
        <BreadcrumbsItem to='/'>Home</BreadcrumbsItem>
        <BreadcrumbsItem to='/projects'>Projects</BreadcrumbsItem>
        <BreadcrumbsItem to={`/projects/{$id}`}>{projectName} / Performance</BreadcrumbsItem>
  
        <div className="mb-1 d-flex">
          <PageTitle>
            {projectName}
            <PageSubtitle>Edit Performance Test</PageSubtitle>
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
                  value={this.props.project.managePerfTestContents} // string
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
            <Button className="py-1 mt-4" color="primary" onClick={this.handleEditTest.bind(this)}>Edit Test</Button>
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
    fetchPerfTestDetails: (projectId, testId) => dispatch(fetchPerfTestDetails(projectId, testId)),
    updatePerfJobContents: (content) => dispatch(updatePerfJobContents(content)),
    storeNewPerformanceTest: (testData, projectId) => dispatch(storeNewPerformanceTest(testData, projectId)),
    fetchSinglePerfTestDetails: (pid, tid) => dispatch(fetchSinglePerfTestDetails(pid, tid)),
    updatePerformanceTest: (pid, tid, content, cb) => dispatch(updatePerformanceTest(pid, tid, content, cb))
  }
} 

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(EditPerformanceTest));
