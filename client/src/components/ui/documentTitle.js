import React from 'react';
import Helmet from 'react-helmet';

const DocumentTitle = ({ title }) => {
    const defaultTitle = 'ZylkerKart';
    return (
        <Helmet>
            <title>{title ? title : defaultTitle}</title>
        </Helmet>
    );
};

export { DocumentTitle };