import React, {useState} from "react";
import {useParams, NavLink} from "react-router-dom";
import PageTitle from "./../../common/PageTitle";
import PageSubtitle from "./../../common/PageSubtitle";
import Job from "./../../common/Job";
import * as Icon from "react-feather";
import SingleProjectMenu from "./SingleProjectMenu";

import {BreadcrumbsItem} from 'react-breadcrumbs-dynamic'
import classnames from 'classnames';

// import {NavLink} from "react-router-dom";

export default function () {
  const {id} = useParams();
  
  return (
    <div>
      <BreadcrumbsItem to='/'>Home</BreadcrumbsItem>
      <BreadcrumbsItem to='/projects'>Projects</BreadcrumbsItem>
      <BreadcrumbsItem to={`/projects/{$id}`}>API Gateway</BreadcrumbsItem>

      <div className="mb-4 d-flex">
        <PageTitle>
          API Gateway
          <PageSubtitle>Performance</PageSubtitle>
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
          <Job/>
        </div>
      </div>
    </div>
  )
}
