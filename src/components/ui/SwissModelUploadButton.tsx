import { type FC, useState } from 'react';
import { type DataValue } from './CsvDownloadButton';
import { HSLToHex } from '../../util/color';

export interface SwissModelUploadButtonProps {
    /** Not shown, the button is an icon: used as its tooltip and accessible name. */
    label?: string;
    ge
    getSegments: () => Record<string, DataValue>[] | Promise<Record<string, DataValue>[]>;
    getSegmentData: () => Record<string, DataValue>[] | Promise<Record<string, DataValue>[]>;
    className?: string;
}

// HACK hardcoded for now
// TODO split and move that to organism configuration
const segmentProtein = {
    // SARS-CoV-2
    "S": "P0DTC2",
    // RSV-A
    // RSV-B
    "F": "O36634",
};
// Special
const segmentDelta = {
    // SARS-CoV-2
    "ORF1b": ((13468-266+1)/3), // ORF1b comes after this position on ORF1a to form together the ORF1ab
};
// With the exception of ORF1a and ORFb which are patched to the lenght of combined ORF1ab, all other are probably accessible from normal resources
const segmentLenght = {
    // SARS-CoV-2
    // TODO patch should be kept in configuration
    // patch ORF1a and ORF1b to reflect the lenght of combined ORF1ab
    "ORF1a": ((13468-266+1)/3)+(21555-13468+1)/3,
    "ORF1b": ((13468-266+1)/3)+(21555-13468+1)/3,
    // TODO remaining should be loaded from the regular resources
    "S": 1273,
};

// HACK more hardcoded shit
// TODO configure
const url = 'https://swissmodel.expasy.org/repository/annotation/create';
// HACK DO NOT USE THIS WAY
// TODO user input box? Generic e-mail for the project?
const email = 'blackcat@sympato.ch';


// HACK that part must go into externalData
const submitSwissModelAnnotation = async (content: String) => {
    const formBody = new FormData();
    formBody.append('email', email);
    // TODO add something about the view: current organism, the current mode
    formBody.append('title', 'Annotation from Wastewater');
    formBody.append('annotation_data', content);

    try {
        // POST API documented here: https://swissmodel.expasy.org/repository/annotation
        const response = await fetch(url, {
            method: 'POST',
            body: formBody,
        });
        console.log("Fetch returned");
        // Parse the JSON response
        const data = await response.json();
        if (response.ok) { // Check if the response status is OK (200-299)
            console.log(data); // Log the response data to the console
        } else {
            console.error(data); // Log the error response to the console
        }
    } catch (error) { // Catch any errors during the request
        console.error("submiting failed");
        console.error(error); // Log the error to the console
    }
}



export const SwissModelUploadButton: FC<SwissModelUploadButtonProps> = ({
    label = 'Upload and View',
    getSegments,
    getSegmentData,
    className,
}) => {
    const [isUploading, setIsUploading] = useState(false);

    const getSegmentRows = async (segment: String) => {
        const data = await getSegmentData(segment);
        if (! segment in segmentProtein)
            return '';
        const prot = segmentProtein[segment];
        const delta = segment in segmentDelta
            ? segmentDelta[segment]
            : 0;
        const lenght = segment in segmentLenght
            ? segmentLenght[segment]
            : 10000; // HACK fallback, unneeded once lenght is built from actual data
        // protein_name start   stop    color   link    label
        const rows = data.map((row) => `${prot}\t${row[0]}\t${row[1]}\t${HSLToHex({h: (row[0]+row[1])*180/lenght, s: 100*row[2], l: 50})}\t${window.location.href}\t${row[3]}` ).join('\n');
        return rows;
    }

    const getUploadContent = async () => {
        const segs = await getSegments();
        console.log(segs);
        // I'm probably holding it wrong?
        const rows = await Promise.all(segs.map(async (seg) => await getSegmentRows(seg)));
        const content = rows.join('\n')
        return `${content}\n`;
    };

    const upload = async () => {
        setIsUploading(true);
        try {
            const content = await getUploadContent();
            console.log(`${content}`)
            await submitSwissModelAnnotation(content);
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <button
        className={className}
        onClick={() => void upload()}
        disabled={isUploading}
        aria-label={label}
        title={label}
        >
        {isUploading ? (
            <span className='loading loading-spinner loading-xs' />
        ) : /* TODO make a mini SVG from SwissModel's official icon */ (
            <span className='iconify mdi--upload' />
        )}
        </button>
    );
};
