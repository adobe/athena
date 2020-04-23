import React from "react";
import {NavLink} from "react-router-dom";
import {withRouter} from "react-router";
import PageTitle from "./../../common/PageTitle";
import PageSubtitle from "./../../common/PageSubtitle";
import Job from "./../../common/Job";
import PerformanceTest from "./../../common/Job/PerformanceTest";
import * as Icon from "react-feather";
import SingleProjectMenu from "./../SingleProject/SingleProjectMenu";
import {BreadcrumbsItem} from 'react-breadcrumbs-dynamic'
import {Button, Input} from 'reactstrap';
import {
  fetchPerfTestRunsUpdates,
  fetchPerfTestDetails,
  schedulePerfTestRun
} from "../../../redux/project/actions";
import {connect} from "react-redux";

class SinglePerformanceTest extends React.Component {
  constructor(props) {
    super(props)
    this.fetchInterval = null;
    this.projectId = null;
    this.testId = null;
  }

  componentWillMount() {
    const { id: projectId, testId } = this.props.match.params;
    const { fetchPerfTestRunsUpdates, fetchPerfTestDetails } = this.props;
    this.projectId = projectId;
    this.testId = testId;

    // Fetch the initial perf test details.
    fetchPerfTestDetails(this.projectId, this.testId);
    this.fetchInterval = setInterval(() => {
      // Fetch perf runs for this perf test every x seconds.
      fetchPerfTestRunsUpdates(projectId, testId)
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.fetchInterval);
    this.projectId = null;
    this.testId = null;
  }

  handleRunPerfTest() {
    if (!window.confirm("Please make sure that you do have the appropriate cluster resources available before scheduling this test!\n\nAre you sure that you would like to continue?")) {
      return
    }
    
    this.props.schedulePerfTestRun(this.projectId, this.testId);
  }

  handleSyncGitRepo() {

  }

  render() {
    const { id, testId } = this.props.match.params;
    const { currentProject }  = this.props.project;
    const { instance: project } = currentProject

    let { data: perfTestData, perfRuns } = this.props.project.single.perfTest;

    // Parse test name.
    let testName = "Loading"
    if (perfTestData && perfTestData.config) {
      testName = perfTestData.config.name
    }

    // Parse perf runs.
    if (perfRuns && perfRuns.length) {
      perfRuns = perfRuns.map((p, k) => <Job key={k} countId={perfRuns.length-k} data={p} />)      
    } else {
      perfRuns = (<span className="d-flex">There are currently no performance runs for this test.</span>)
    }

    return (
      <div>
        <BreadcrumbsItem to='/'>Home</BreadcrumbsItem>
        <BreadcrumbsItem to='/projects'>Projects</BreadcrumbsItem>
        <BreadcrumbsItem to={`/projects/${id}/performance`}>{project && project.name || '-'} / Performance</BreadcrumbsItem>
        <BreadcrumbsItem to={`/projects/${id}/performance/${testId}`}>{testName}</BreadcrumbsItem>
  
        <div className="mb-1 d-flex">
          <PageTitle>
            {project && project.name || '-'}
            <PageSubtitle>Performance Tests</PageSubtitle>
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
          <div className="row px-0 ">
            <div className="col px-0">
              <hr />
            </div>
          </div>
          
          <div className="row px-0">
            <div className="col-3 px-0 d-flex">
              <h5 className="mt-2">{testName}</h5>
  
              {/* <div className="perf-test__agents">
                <Icon.Server/>
                1
              </div>
      
              <div className="perf-test__rps">
                <Icon.Zap/>
                1
              </div>
      
              <div className="perf-test__reqtypes">
                <Icon.Layers/>
                1
              </div>
      
              <div className="perf-test__lastrun">
                <Icon.Calendar/>
                10
              </div>
      
              <div className="job__duration">
                <Icon.Clock/>
                10
              </div> */}
            </div>
  
            <div className="col-3 ml-auto px-0 d-flex">
              <Button onClick={this.handleSyncGitRepo.bind(this)} color="secondary" className="d-flex ml-auto">Edit</Button>
              <Button onClick={this.handleRunPerfTest.bind(this)} color="success" className="d-flex ml-2">Run Now</Button>
            </div>
          </div>
  
          <div className="row px-0 mb-2">
            <div className="col px-0">
              <hr />
            </div>
          </div>
          
          <div className="row px-0 mb-3">
            <div className="col px-0">
              <span className="page-subtitle ml-0 mt-2  mb-2">Test Runs</span>
            </div>
          </div>

          <div className="row">
              {perfRuns}
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
    fetchPerfTestRunsUpdates: (pid, tid) => dispatch(fetchPerfTestRunsUpdates(pid, tid)),
    fetchPerfTestDetails: (pid, tid) => dispatch(fetchPerfTestDetails(pid, tid)),
    schedulePerfTestRun: (pid, tid) => dispatch(schedulePerfTestRun(pid, tid))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(SinglePerformanceTest));
