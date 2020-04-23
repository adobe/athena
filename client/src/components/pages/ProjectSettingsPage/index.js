import React, {useState} from "react";
import {useParams, NavLink} from "react-router-dom";
import PageTitle from "./../../common/PageTitle";
import PageSubtitle from "./../../common/PageSubtitle";
import Job from "./../../common/Job";
import * as Icon from "react-feather";
import SingleProjectMenu from "./../SingleProject/SingleProjectMenu";
import {BreadcrumbsItem} from 'react-breadcrumbs-dynamic'

export default function () {
  const {id} = useParams();

  return (
    <div>
      <BreadcrumbsItem to='/'>Home</BreadcrumbsItem>
      <BreadcrumbsItem to='/projects'>Projects</BreadcrumbsItem>
      <BreadcrumbsItem to={`/projects/{$id}`}>API Gateway / Settings</BreadcrumbsItem>

      <div className="mb-4 d-flex">
        <PageTitle> 
          Project
          <PageSubtitle>Settings</PageSubtitle>
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
        <div className="row">
          <div className="col-md-6 order-md-1 px-0">
            <form className="needs-validation" noValidate="">

            <div className="mb-3">
                <label htmlFor="email">
                  Project Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="email" />
              </div>

              <div className="mb-3">
                <label htmlFor="email">
                  Description
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="email" />
              </div>

              <div className="mb-3">
                <label htmlFor="email">
                  Tests Repository URL
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="email" />
              </div>

              <button className="btn btn-primary" type="submit">Save Settings</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
