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

        // TODO: Ask Jack and Clay if HTTPS vs HTTP should be determined for assembling the URL of the site for crawling
        let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
        let otherPossibleSecureHttpStatus = site.services.nginx.role;

        console.log(routeChildrenProps);
        console.log(siteStatus);
        console.log(site);
        console.log(siteDomain);


        return (
            <div style={{ flex: '1', overflowY: 'auto' }}>
                <h2>Hello World!</h2>
            </div>
        )
    }

}