import React, {useState} from "react";
import {useParams, NavLink} from "react-router-dom";
import {withRouter} from "react-router";
import PageTitle from "./../../common/PageTitle";
import PageSubtitle from "./../../common/PageSubtitle";
import Job from "./../../common/Job";
import PerformanceTest from "./../../common/Job/PerformanceTest";
import * as Icon from "react-feather";
import SingleProjectMenu from "./../SingleProject/SingleProjectMenu";
import {BreadcrumbsItem} from 'react-breadcrumbs-dynamic'
import {Button, Input} from 'reactstrap';
import ContentLoader from 'react-content-loader'
import {
  readProjectDetails,
  readProjectPerfTests
} from "../../../redux/project/actions";
import {connect} from "react-redux";

class PerformanceTestsPage extends React.Component {
  constructor(props) {
    super(props)
  }

  componentWillMount() {
    const { id } = this.props.match.params;
    const { readProjectDetails, readProjectPerfTests } = this.props;
    readProjectDetails(id);
    readProjectPerfTests(id);
  }

  handleSyncGitRepo() {
    if (!window.confirm("Syncing this project's Git repository will update all tests with the same name and create new tests from those missing!\n\nWould like to continue?")) {
      return;
    }

    // TODO: Sync git repo here.
  }

  render() {
    const { id } = this.props.match.params;
    const { currentProject }  = this.props.project;
    const { instance: project, perfTests } = currentProject

    let performanceTests = <p>Loading perf tests...</p>

    if (perfTests && perfTests.length) {
      performanceTests = perfTests.map((p, k) => {
        return <PerformanceTest test={p} />
      })
    } else {
      performanceTests = <p>There are currently no performance tests available for this project. Please create a new one!</p>
    }

    return (
      <div>
        <BreadcrumbsItem to='/'>Home</BreadcrumbsItem>
        <BreadcrumbsItem to='/projects'>Projects</BreadcrumbsItem>
        <BreadcrumbsItem to={`/projects/${id}`}>{project && project.name || '-'} / Performance</BreadcrumbsItem>
  
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
            <div className="col-3 px-0">
              <Input placeholder="Filter performance tests..."/>
            </div>
  
            <div className="col-3 ml-auto px-0 d-flex">
              {/* <Button onClick={this.handleSyncGitRepo.bind(this)} color="secondary" className="d-flex ml-auto">Sync Git Repo</Button> */}
              <Button onClick={() => { this.props.history.push(`/projects/${id}/performance/new`) }} color="primary" className="d-flex ml-auto">Create New Test</Button>
            </div>
          </div>
  
          <div className="row px-0 mb-2">
            <div className="col px-0">
              <hr />
            </div>
          </div>
          
          <div className="row px-0">
            {performanceTests}
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
    readProjectDetails: (id) => dispatch(readProjectDetails(id)),
    readProjectPerfTests: (id) => dispatch(readProjectPerfTests(id))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PerformanceTestsPage));

