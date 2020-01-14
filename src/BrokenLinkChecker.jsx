import React, { Component, Fragment } from 'react';
import classnames from 'classnames';
import { ipcRenderer } from 'electron';
import { confirm } from '@getflywheel/local/renderer';
import path from 'path';

export default class BrokenLinkChecker extends Component {



    render() {

        let routeChildrenProps = this.props.routeChildrenProps.routeChildrenProps;
        let site = routeChildrenProps.site;
        let siteDomain = site.domain;
        let siteStatus = routeChildrenProps.siteStatus;

        let siteUrl = 'http://' + siteDomain;

        // TODO: Add checking to see if site is running with HTTP or HTTPS. Right now HTTP is assumed
        //let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
        //let otherPossibleSecureHttpStatus = site.services.nginx.role;


        return (
            <div style={{ flex: '1', overflowY: 'auto' }}>
                <h2>{siteUrl}</h2>
            </div>
        )
    }

}