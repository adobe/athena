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
      <BreadcrumbsItem to={`/projects/{$id}`}>- / Functional</BreadcrumbsItem>

      <div className="mb-4 d-flex">
        <PageTitle>
          -
          <PageSubtitle>Functional Tests</PageSubtitle>
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
          Functional tests cannot be managed via the Dashboard right now.
        </div>
      </div>
    </div>
  )
}
