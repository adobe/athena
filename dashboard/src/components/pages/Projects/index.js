import React from "react";
import {connect} from "react-redux";
import * as Icon from "react-feather";
import PageTitle from "./../../common/PageTitle";
import { NavLink } from "react-router-dom";
import {BreadcrumbsItem} from 'react-breadcrumbs-dynamic'
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input } from 'reactstrap';
import {
  readProjects,
  toggleCreateProjectModal,
  changeProjectName,
  changeProjectDescription,
  changeProjectGitRepo,
  storeNewProject
} from "../../../redux/project/actions";

import "./style.css";

class ProjectsContainer extends React.Component {
  constructor(props) {
    super(props);
  }

  componentWillMount() {
    this.props.readProjects();
  }

  handleCreateNewProject = () => {
    const { state } = this.props;

    // Store the new project.
    this.props.storeNewProject({
      name: state.modalProjectName,
      description: state.modalProjectDescription,
      repoUrl: state.modalProjectRepoName
    });

    this.props.toggleCreateProjectModal();
  }

  handleChangeProjectName = (e) => {
    this.props.changeProjectName(e.target.value);
  }

  handleChangeProjectDescription = (e) => {
    this.props.changeProjectDescription(e.target.value);
  }

  handleChangeGitRepo = (e) => {
    this.props.changeProjectGitRepo(e.target.value);
  }

  render() {
    const { state } = this.props;
    let projectsList = (<p>Loading projects...</p>)
    
    // Check whether there are any projects and make sure that they're currently not loading.
    // If so, then render each of them.
    if (state && state.projects && state.projects.length && !state.loading.projects) {
      projectsList = (
          <>
            {state.projects.map((p, k) => {
              return (
                <div className="col-3">
                  <div className="project-card card box-shadow border-0 mb-3" key={k}>
                  <NavLink to={`/projects/${p._id}/performance`}>
                    <div className="card-body d-flex">
                      <div className="my-auto pr-3">
                        <Icon.Folder color="#b5bdc3"/>
                      </div>
                      <div>
                        <h5 className="card-title mb-0">{p.name}</h5>
                        <p className="card-text text-secondary">{p.description || "-"}</p>
                      </div>
                    </div>
                  </NavLink>
                </div>
              </div>
              )
            })}
          </>
        )
    } else {
      projectsList = (<p>There are no projects available. Please create one!</p>)
    }

    return (
      <div>
        <BreadcrumbsItem to='/'>Home</BreadcrumbsItem>
        <BreadcrumbsItem to='/projects'>Projects</BreadcrumbsItem>

        <div className="d-flex mb-3">
          <PageTitle>Projects</PageTitle>
          <Button className="ml-auto py-1" size="sm" color="primary" onClick={this.props.toggleCreateProjectModal}>
            <Icon.PlusCircle size={15} className="mr-1"/>
            Create Project
          </Button>
        </div>

        <div className="container">
          <div className="row">
            {projectsList}
          </div>
        </div>

        {/* Modal :: Create New Project */}
        <Modal isOpen={state.modalVisible}>
          <ModalHeader>Create Project</ModalHeader>
          <ModalBody>
            <Form onSubmit={(e) => e.preventDefault()}>
              <FormGroup>
                <Label for="project-name">Name</Label>
                <Input type="text" id="project-name" name="projectName" onChange={this.handleChangeProjectName} />
              </FormGroup>
              <FormGroup>
                <Label for="project-description">Description</Label>
                <Input type="text" name="projectDescription" id="project-description" onChange={this.handleChangeProjectDescription} />
              </FormGroup>
              <FormGroup>
                <Label for="project-repo">Git Repository</Label>
                <Input type="text" name="projectDescription" id="project-repo" onChange={this.handleChangeGitRepo} />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={this.props.toggleCreateProjectModal}>Cancel</Button>
            <Button color="primary" onClick={this.handleCreateNewProject}>Create</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    state: state.project
  }
}

const mapDispatchToProps = dispatch => {
  return {
    readProjects: () => dispatch(readProjects()),    
    toggleCreateProjectModal: () => dispatch(toggleCreateProjectModal()),
    changeProjectName: (name) => dispatch(changeProjectName(name)),
    changeProjectDescription: (description) => dispatch(changeProjectDescription(description)),
    changeProjectGitRepo: (repoName) => dispatch(changeProjectGitRepo(repoName)),
    storeNewProject: (data) => dispatch(storeNewProject(data))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProjectsContainer);
