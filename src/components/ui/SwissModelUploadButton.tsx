// from DropDown
import { flip, offset, shift } from '@floating-ui/dom';
import { type Placement } from '@floating-ui/utils';
import { type FC, useState } from 'react';
import { /* type FC ,*/ type ReactNode, useRef /*, useState */ } from 'react';

// import { type DataValue } from './CsvDownloadButton';
import { dropdownClass } from './Dropdown';
import { useCloseOnClickOutside, useCloseOnEsc, useFloatingUi } from './floatingUiHooks';
import { getClientLogger } from '../../logging';
import { getErrorLogMessage } from '../../logging';
import { HSLToHex } from '../../util/color';

const logger = getClientLogger('SwissModelUploadButton');

// HACK the DropDown functionnality is done by copy-pasting from DropDown
// TODO there's probably some inheritence and/or common sub-code split out?
export interface SwissModelUploadButtonProps {
    /** Not shown, the button is an icon: used as its tooltip and accessible name. */
    label?: string;
    getSegments: () => string[] | Promise<string[]>;
    getSegmentData: (seg: string) => [number, number, number, string][] | Promise<[number, number, number, string][]>;
    className?: string;
    // from Dropdown
    placement?: Placement;
    children?: ReactNode;
}

// HACK hardcoded for now
// TODO split and move that to organism configuration
// Uniprot ID of the protein, to help searching in databases, e.g. SwissModel
const segmentProtein: Record<string, string> = {
    // SARS-CoV-2
    ORF1a: 'P0DTC1',
    ORF1b: 'P0DTD1', // Uniprot ID is for ORF1ab, use delta below to adapt position
    S: 'P0DTC2',
    ORF3a: 'P0DTC3', // 3b, 3c, 3d are nested within ORF3a
    E: 'P0DTC4',
    M: 'P0DTC5',
    ORF6: 'P0DTC6',
    ORF7a: 'P0DTC7',
    ORF7b: 'P0DTD8',
    ORF8: 'P0DTC8',
    N: 'P0DTC9',
    ORF9b: 'P0DTD2',
    /*
    // RSV-A
    "NS1": "P0DOE9",
    "NS2": "P04543",
    "N": "P03418",
    "P": "P03421",
    "M": "P0DOE7",
    "SH": "P0DOE5",
    "G": "P03423",
    "F": "P03420",
    "M2-1": "P04545",
    "M2-2": "P88812",
    "L": "P28887",
*/
    // RSV-B
    NS1: 'O42083',
    NS2: 'O42038',
    //    N: 'O42053',
    P: 'O42062',
    //    M: 'O42049',
    SH: 'O36632',
    G: 'O36633',
    F: 'O36634',
    'M2-1': 'O42050',
    'M2-2': 'O42047',
    L: 'O36635',
};
// Special
const segmentDelta: Record<string, number> = {
    // SARS-CoV-2
    ORF1b: (13468 - 266 + 1) / 3, // ORF1b comes after this position on ORF1a to form together the ORF1ab
};
// With the exception of ORF1a and ORFb which are patched to the lenght of combined ORF1ab, all other are probably accessible from normal resources
const segmentLenght: Record<string, number> = {
    // SARS-CoV-2
    // TODO patch should be kept in configuration
    // patch ORF1a and ORF1b to reflect the lenght of combined ORF1ab
    ORF1a: (13468 - 266 + 1) / 3 + (21555 - 13468 + 1) / 3 - 1,
    ORF1b: (13468 - 266 + 1) / 3 + (21555 - 13468 + 1) / 3 - 1,
    // TODO remaining should be loaded from the regular resources
    S: 1273,
    ORF3a: 275,
    E: 75,
    M: 222,
    ORF6: 61,
    ORF7a: 121,
    ORF7b: 43,
    ORF8: 121,
    N: 419,
    ORF9b: 97,
    /*
    // RSV-A
    'NS1': 139,
    'NS2': 124,
    'N': 391,
    'P': 241,
    'M': 256,
    'SH': 64,
    'G': 321,
    'F': 574,
    'M2-1': 194,
    'M2-2': 90,
    'L': 2165,
*/
    // RSV-B
    NS1: 139,
    NS2: 124,
    //    N: 391,
    P: 241,
    //    M: 256,
    SH: 65,
    G: 310,
    F: 574,
    'M2-1': 195,
    'M2-2': 90,
    L: 2166,
};

// HACK more hardcoded shit
// TODO configure
const repoUrl = 'https://swissmodel.expasy.org/repository';
// HACK DO NOT USE THIS WAY
// TODO user input box? Generic e-mail for the project?
const email = 'blackcat@sympato.ch';

// HACK that part must go into externalData
const submitSwissModelAnnotation = async (content: string): Promise<string> => {
    const formBody = new FormData();
    formBody.append('email', email);
    // TODO add something about the view: current organism, the current mode
    formBody.append('title', 'Annotation from Wastewater');
    formBody.append('annotation_data', content);

    const url = `${repoUrl}/annotation/create`;
    try {
        // POST API documented here: https://swissmodel.expasy.org/repository/annotation
        const response = await fetch(url, {
            method: 'POST',
            body: formBody,
        });
        logger.debug('Fetch returned');
        // Parse the JSON response
        const data = await response.json();
        if (response.ok) {
            // Check if the response status is OK (200-299)
            logger.debug(data); // Log the response data to the console
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const typedData: { project_id: string } = data;

            return typedData.project_id;
        } else {
            logger.error(`Submit annotations to ${url} returned an error: ${data}`);
        }
    } catch (error) {
        // Catch any errors during the request
        logger.error(`Failed to submit annotations to ${url}: ${getErrorLogMessage(error)}`);
    }
    return '';
};

const mkSwissModelProjectURL = (projectId: string): string => {
    return `${repoUrl}/annotation/${projectId}`;
};

const mkSwissModelProteinURL = (projectId: string, proteinId: string): string => {
    return `${repoUrl}/uniprot/${proteinId}?annotations=${projectId}`;
};

// HACK the DropDown functionnality is done by copy-pasting from DropDown, I am most likely doing TypeScript's object-orientedness wrong
export const SwissModelUploadButton: FC<SwissModelUploadButtonProps> = ({
    label = 'Upload and View',
    getSegments,
    getSegmentData,
    className,
    placement,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [linkOuts, setLinkOuts] = useState(Array<ReactNode>(0));

    // from DropDown
    const [showContent, setShowContent] = useState(false);
    const referenceRef = useRef<HTMLButtonElement>(null);
    const floatingRef = useRef<HTMLDivElement>(null);

    useFloatingUi(referenceRef, floatingRef, [offset(4), shift(), flip()], placement);

    useCloseOnClickOutside(floatingRef, referenceRef, setShowContent);
    useCloseOnEsc(setShowContent);

    const toggle = () => {
        setShowContent(!showContent);
    };

    // prepare CSV to upload for 1 protein
    const getSegmentRows = async (segment: string) => {
        const data = await getSegmentData(segment);
        if (!(segment in segmentProtein)) {
            return '';
        }
        const prot = segmentProtein[segment];
        const delta = segment in segmentDelta ? segmentDelta[segment] : 0;
        const lenght = segment in segmentLenght ? segmentLenght[segment] : 10000; // HACK fallback, unneeded once lenght is built from actual data
        // protein_name start   stop    color   link    label
        const rows = data
            .map(
                (row) =>
                    `${prot}\t${delta + row[0]}\t${delta + row[1]}\t${HSLToHex({ h: ((delta + row[0] + delta + row[1]) * 180) / lenght, s: 100 * row[2], l: 50 })}\t${window.location.href}\t${row[3]}`,
            )
            .join('\n');
        return rows;
    };

    const getUploadContent = async () => {
        const segs = await getSegments();
        logger.debug(segs.join('\n'));
        // I'm probably holding it wrong?
        const rows = await Promise.all(segs.map(async (seg) => await getSegmentRows(seg)));
        const content = rows.join('\n');
        return `${content}\n`;
    };

    const upload = async () => {
        if (projectId === '') {
            setIsUploading(true);
            try {
                const content = await getUploadContent();
                logger.debug(content);
                const fetchedProjectId = await submitSwissModelAnnotation(content);
                if (fetchedProjectId !== '') {
                    setProjectId(fetchedProjectId);
                    setLinkOuts(await generateLinkOuts(fetchedProjectId));
                    setShowContent(true);
                }
            } finally {
                setIsUploading(false);
            }
        } else {
            toggle();
        }
    };

    // dog typing
    const generateLinkOuts = async (id: string): Promise<ReactNode[]> => {
        const segs = await getSegments();
        return segs.map((seg) => (
            <li key={`${seg}_${segmentProtein[seg]}`}>
                <a href={mkSwissModelProteinURL(id, segmentProtein[seg])}>
                    3D View of {seg} (Uniprot: {segmentProtein[seg]})
                </a>
            </li>
        ));
    };

    return (
        <>
            <button
                className={className}
                onClick={() => void upload()}
                disabled={isUploading}
                aria-label={label}
                title={label}
                // from DropDown
                ref={referenceRef}
            >
                {isUploading ? (
                    <span className='loading loading-spinner loading-xs' />
                ) : (
                    /* TODO make a mini SVG from SwissModel's official icon */ <>
                        <span className='iconify mdi--upload' />
                        <span hidden>{projectId}</span>
                    </>
                )}
            </button>
            {projectId !== '' ? (
                /* from DropDown */ <div
                    ref={floatingRef}
                    className={`${dropdownClass} ${showContent ? '' : 'hidden'}`}
                >
                    <a href={mkSwissModelProjectURL(projectId)}>SwissModel Annotation Project {projectId}</a>
                    <ul>{linkOuts}</ul>
                </div>
            ) : (
                <span hidden>no project id yet</span>
            )}
        </>
    );
};
