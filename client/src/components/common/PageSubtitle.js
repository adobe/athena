import React from "react";

import './PageSubtitle.scss';

export default function(props) {
    return (
        <span className="page-subtitle">{props.children}</span>
    )
}