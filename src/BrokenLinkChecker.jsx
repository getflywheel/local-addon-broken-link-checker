import React, { Component, Fragment } from 'react';
const { SiteChecker } = require('broken-link-checker');

export default class BrokenLinkChecker extends Component {

    componentDidMount() {

        let routeChildrenProps = this.props.routeChildrenProps.routeChildrenProps;
        let site = routeChildrenProps.site;
        let siteDomain = site.domain;
        let siteStatus = routeChildrenProps.siteStatus;

        // TODO: Add checking to see if site is running with HTTP or HTTPS. Right now HTTP is assumed
        //let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
        //let otherPossibleSecureHttpStatus = site.services.nginx.role;

        let siteUrl = 'http://' + siteDomain;

        this.checkLinks(siteUrl);

    }

    checkLinks(siteURL) {
        let siteChecker = new SiteChecker(null, {
            link: function (result, customData) {
                if (result.broken) {
                    console.log("Origin:" + String(result.base.original));
                    console.log(String(result.url.original) + ": " + String(result.broken));
                }
            }
        });
        siteChecker.enqueue(siteURL);
    }


    render() {

        return (
            <div style={{ flex: '1', overflowY: 'auto' }}>
                <h2>Hello World</h2>
            </div>
        )
    }

}