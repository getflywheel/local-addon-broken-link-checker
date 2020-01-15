import React, { Component, Fragment } from 'react';
const { SiteChecker } = require('broken-link-checker');

export default class BrokenLinkChecker extends Component {

    constructor(props) {

        super(props);

        this.state = {
            brokenLinks: [],
        };

        this.checkLinks = this.checkLinks.bind(this);
    }

    addBrokenLink(brokenLinkArray) {
        this.setState(prevState => ({
            brokenLinks: [...prevState.brokenLinks, brokenLinkArray]
        }));
    }

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
            link: (result, customData) => {
                if (result.broken) {
                    console.log("Origin Page:" + String(result.base.original));
                    console.log(String(result.url.original) + ": " + String(result.broken));

                    this.addBrokenLink("Origin Page:" + String(result.base.original) + " | Broken Link: " + String(result.url.original));
                }
            }
        });
        siteChecker.enqueue(siteURL);
    }

    render() {

        return (
            <div style={{ flex: '1', overflowY: 'auto' }}>
                <h2>Behold the links:</h2>
                <ul>
                    {this.state.brokenLinks.map(item => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>
        )
    }

}