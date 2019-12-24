import React, { Component, Fragment } from 'react';
import classnames from 'classnames';
import { ipcRenderer } from 'electron';
import { confirm } from '@getflywheel/local/renderer';
import path from 'path';

export default class BrokenLinkChecker extends Component {

    render() {
        console.log('Trying to return Hello World');

        return (
            <div style={{ flex: '1', overflowY: 'auto' }}>
                <h2>Hello World!</h2>
            </div>
        )
    }

}