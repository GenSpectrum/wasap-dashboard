import { type FC, type PropsWithChildren } from 'react';
import { Modal } from './modal';

const Info: FC<PropsWithChildren> = ({ children }) => {
    return (
        <div className='relative inline-flex'>
            <Modal buttonClassName='btn btn-xs' modalContent={children}>
                ?
            </Modal>
        </div>
    );
};

export const InfoHeadline1: FC<PropsWithChildren> = ({ children }) => {
    return <h1 className='text-justify text-lg font-bold'>{children}</h1>;
};

export const InfoHeadline2: FC<PropsWithChildren> = ({ children }) => {
    return <h2 className='mt-4 text-justify text-base font-bold'>{children}</h2>;
};

export const InfoParagraph: FC<PropsWithChildren> = ({ children }) => {
    // A <div>, not a <p>: several callers nest block content (lists, a code block, a
    // form) inside this, which isn't valid inside <p> and made the browser silently
    // close the tag early, breaking the DOM structure React expected.
    return <div className='my-1 text-justify text-base font-normal text-wrap'>{children}</div>;
};

export const InfoLink: FC<PropsWithChildren<{ href: string }>> = ({ children, href }) => {
    return (
        <a className='text-blue-600 hover:text-blue-800' href={href} target='_blank' rel='noopener noreferrer'>
            {children}
        </a>
    );
};

export type InfoComponentCodeProps = {
    componentName: string;
    params: object;
    lapisUrl: string;
};

export const InfoComponentCode: FC<InfoComponentCodeProps> = ({ componentName, params, lapisUrl }) => {
    const componentCode = componentParametersToCode(componentName, params, lapisUrl);
    const codePenData = {
        title: 'GenSpectrum dashboard component',
        html: generateFullExampleCode(componentCode, componentName),
        layout: 'left',
        editors: '100',
    };
    return (
        <>
            <InfoHeadline2>Use this component yourself</InfoHeadline2>
            <InfoParagraph>
                This component was created using the following parameters:
                <div className='overflow-x-auto rounded-lg border border-gray-200 p-4'>
                    <pre>
                        <code>{componentCode}</code>
                    </pre>
                </div>
            </InfoParagraph>
            <InfoParagraph>
                You can add this component to your own website using the{' '}
                <InfoLink href='https://github.com/GenSpectrum/dashboard-components'>
                    GenSpectrum dashboard components library
                </InfoLink>{' '}
                and the code from above.
            </InfoParagraph>
            <InfoParagraph>
                <form action='https://codepen.io/pen/define' method='POST' target='_blank'>
                    <input
                        type='hidden'
                        name='data'
                        value={JSON.stringify(codePenData).replace(/"/g, '&quot;').replace(/'/g, '&apos;')}
                    />

                    <button className='text-blue-600 hover:text-blue-800' type='submit'>
                        Click here to try it out on CodePen.
                    </button>
                </form>
            </InfoParagraph>
        </>
    );
};

export default Info;

function componentParametersToCode(componentName: string, params: object, lapisUrl: string) {
    const stringifyIfNeeded = (value: unknown) => {
        return typeof value === 'object' ? JSON.stringify(value) : value;
    };

    const attributes = indentLines(
        Object.entries(params)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => `${key}='${stringifyIfNeeded(value) as string}'`)
            .join('\n'),
        4,
    );
    return `<gs-app lapis="${lapisUrl}">\n  <gs-${componentName}\n${attributes}\n  />\n</gs-app>`;
}

function generateFullExampleCode(componentCode: string, componentName: string) {
    const storyBookPath = `/docs/visualization-${componentName}--docs`;
    return `<html>
<head>
  <script type="module" src="https://unpkg.com/@genspectrum/dashboard-components@latest/standalone-bundle/dashboard-components.js"></script>
</head>

<body>
  <!-- Component documentation: https://genspectrum.github.io/dashboard-components/?path=${storyBookPath} -->
${indentLines(componentCode, 2)}
</body>
</html>
`;
}

function indentLines(text: string, numberSpaces: number) {
    const spaces = ' '.repeat(numberSpaces);
    return text
        .split('\n')
        .map((line) => spaces + line)
        .join('\n');
}
