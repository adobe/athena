import React from "react";
import * as Icon from "react-feather";
import {NavLink} from "react-router-dom";
import classnames from "classnames"
import moment from "moment";

import './style.scss';

export default function (props) {
  const { data, countId } = props;
  const isCompleted = data.status === "COMPLETED";
  const statusClass = `job--${isCompleted ? "success" : "running"}`;
  const jobStatusContent = isCompleted ? (<Icon.Check className="text-success"/>) : (<Icon.Loader />);
  const reportStyles = { display: isCompleted ? "block" : "none" }
  let { cpu: cpuCount, memory: memoryCount, agents: agentsCount } = data.config.resources;
  const {connectionRate, connections} = data.config.config;

  if (cpuCount === 0) {
    cpuCount = "∞";
  }

  let rpsCount = "∞"

  if (connectionRate) {
    rpsCount = `${connectionRate} RPS / Agent`
  }

  if (connections) {
    rpsCount = `${connections} Connections`;
  }

  return (
    <div className={`job ${statusClass} card box-shadow px-0 col-12 mb-2`}>
      <div className="card-body d-flex flex-row p-3">

        <div className="job__status">
          {jobStatusContent}
        </div>

        <div className="job__id">
          <b>#{countId}</b>
        </div>

        <div className="job__agents">
          <Icon.Server/>
          {agentsCount} {`Agent${agentsCount != 1 ? "s" : ""}`}
        </div>

        <div className="job__rpsCount">
          <Icon.Zap/>
          {rpsCount}
        </div>

        <div className="job__duration">
          <Icon.Clock/>
          {moment.utc(data.config.config.duration * 1000).format('mm:ss')}
        </div>

        <div className="job__cpu">
          <Icon.Cpu/>
          {cpuCount}
        </div>

        <div className="job__memory">
          <Icon.Database/>
          {memoryCount}
        </div>

        <div className="job__date">
          <Icon.Calendar/>
          {moment(data.createdAt).fromNow()}
        </div>

        <div className="ml-auto">
          <a style={reportStyles} href={`${getReportURL(data._id)}`} target="_blank">View Report &rarr;</a>
        </div>

      </div>
    </div>
  )
}

function getReportURL(jobId) {
  return `http://localhost:5601/app/kibana#/dashboard/75cee140-f301-11e9-958d-5f19d72fc93d?_g=(refreshInterval:(pause:!t,value:0))&_a=(description:'',filters:!(),fullScreenMode:!f,options:(hidePanelTitles:!f,useMargins:!t),panels:!((embeddableConfig:(),gridData:(h:6,i:'881078fc-9748-4c9e-a24c-0c8e68db3fb0',w:6,x:0,y:0),id:'1a5466e0-f36b-11e9-958d-5f19d72fc93d',panelIndex:'881078fc-9748-4c9e-a24c-0c8e68db3fb0',type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:6,i:f4d827e8-f6a1-4808-94f7-ebb132baf81c,w:7,x:6,y:0),id:'6f72c7c0-f32a-11e9-958d-5f19d72fc93d',panelIndex:f4d827e8-f6a1-4808-94f7-ebb132baf81c,type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:6,i:'791c87cc-d75b-48ae-ba8d-42441033f154',w:7,x:13,y:0),id:'56433fc0-f328-11e9-958d-5f19d72fc93d',panelIndex:'791c87cc-d75b-48ae-ba8d-42441033f154',type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:6,i:'17af236a-5063-4714-b934-f4c966ce93d9',w:8,x:20,y:0),id:'0213a450-f36c-11e9-958d-5f19d72fc93d',panelIndex:'17af236a-5063-4714-b934-f4c966ce93d9',type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:6,i:ecbf79eb-5bb2-4847-b59f-32e42f3fccdc,w:7,x:28,y:0),id:f8c270b0-f326-11e9-958d-5f19d72fc93d,panelIndex:ecbf79eb-5bb2-4847-b59f-32e42f3fccdc,type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:6,i:ba15cc41-c73c-4dc1-8b4b-8e9fd52fb428,w:6,x:35,y:0),id:'51bbd850-f327-11e9-958d-5f19d72fc93d',panelIndex:ba15cc41-c73c-4dc1-8b4b-8e9fd52fb428,type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:6,i:cd878efc-243d-4ae0-8fb7-70f0eaf6281b,w:7,x:41,y:0),id:'47199b60-f329-11e9-958d-5f19d72fc93d',panelIndex:cd878efc-243d-4ae0-8fb7-70f0eaf6281b,type:visualization,version:'7.4.0'),(embeddableConfig:(colors:('Requests%20per%20Second':%23962D82,'Total%20RPS':%23BF1B00),legendOpen:!f,vis:(colors:('Requests%20per%20Second':%23962D82,'Total%20RPS':%23BF1B00),legendOpen:!t)),gridData:(h:14,i:fa03807b-d08d-4c3a-a0fc-2642322c5bc8,w:21,x:0,y:6),id:'0b2ffcd0-f323-11e9-958d-5f19d72fc93d',panelIndex:fa03807b-d08d-4c3a-a0fc-2642322c5bc8,type:visualization,version:'7.4.0'),(embeddableConfig:(colors:('Max%20count':%23629E51),vis:(colors:('Max%20count':%23629E51,'Requests%20Increase':%230A437C))),gridData:(h:14,i:'4214e7ec-834e-4a13-b1bb-0421c2f2d8b0',w:21,x:21,y:6),id:a4f72d40-f326-11e9-958d-5f19d72fc93d,panelIndex:'4214e7ec-834e-4a13-b1bb-0421c2f2d8b0',type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:5,i:'10947ef0-ec6a-4b70-9957-749313533ce3',w:6,x:42,y:6),id:a728c860-f328-11e9-958d-5f19d72fc93d,panelIndex:'10947ef0-ec6a-4b70-9957-749313533ce3',type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:5,i:eac1a5ff-73d8-4195-93ae-86c448c314d9,w:6,x:42,y:11),id:d60afff0-f327-11e9-958d-5f19d72fc93d,panelIndex:eac1a5ff-73d8-4195-93ae-86c448c314d9,type:visualization,version:'7.4.0'),(embeddableConfig:(),gridData:(h:4,i:'6e525337-e9ab-4388-808d-3d87a0709d31',w:6,x:42,y:16),id:'490c36d0-f3dd-11e9-958d-5f19d72fc93d',panelIndex:'6e525337-e9ab-4388-808d-3d87a0709d31',type:visualization,version:'7.4.0'),(embeddableConfig:(colors:('25th%20percentile%20of%20Requests%20(RPS)':%230A50A1,'50th%20percentile%20of%20Requests%20(RPS)':%23BF1B00,'75th%20percentile%20of%20Requests%20(RPS)':%23E0752D,'90th%20percentile%20of%20Requests%20(RPS)':%23E5AC0E,'99th%20percentile%20of%20Requests%20(RPS)':%23629E51),vis:(colors:('10th%20percentile%20of%20Requests%20(RPS)':%233F2B5B,'25th%20percentile%20of%20Requests%20(RPS)':%230A50A1,'50th%20percentile%20of%20Requests%20(RPS)':%23BF1B00,'75th%20percentile%20of%20Requests%20(RPS)':%23E0752D,'90th%20percentile%20of%20Requests%20(RPS)':%23E5AC0E,'99th%20percentile%20of%20Requests%20(RPS)':%23629E51))),gridData:(h:7,i:a262ac5e-adaf-497f-8347-b9a270ba8f66,w:48,x:0,y:20),id:'7f39c0c0-f32d-11e9-958d-5f19d72fc93d',panelIndex:a262ac5e-adaf-497f-8347-b9a270ba8f66,type:visualization,version:'7.4.0')),query:(language:kuery,query:'job_id:%20%22${jobId}%22'),timeRestore:!f,title:'Performance%20Reports',viewMode:view)`
}