import React from "react";
import "./SingleProjectMenu.scss";

export default function (props) {
  return (
    <div className="single-project-menu ml-auto">
      <nav className="nav nav-underline">
          {props.children}
      </nav>
    </div>
  )
}