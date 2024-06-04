import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import './PdfSummarizer.css';
import { GoogleGenerativeAI } from '@google/generative-ai';
import parse from 'html-react-parser';
import { ProgressBar } from 'react-loader-spinner';


pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PdfSummarizer = () => {
    const [file, setFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [text, setText] = useState('');
    const [summary, setSummary] = useState([]);
    const [sections, setSections] = useState([]);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [loading, setLoading] = useState(false);

    const generationConfig = {
        stopSequences: ["red"],
        maxOutputTokens: 300,
        temperature: 0.5,
        topP: 0.4,
        topK: 10,
    };

    const genAI = new GoogleGenerativeAI('THE_API_KEY', generationConfig);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });

    const onFileChange = async (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const buffer = e.target.result;
            const typedArray = new Uint8Array(buffer);
            const pdf = await pdfjs.getDocument(typedArray).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const pageText = await page.getTextContent();
                const pageString = pageText.items.map((item) => item.str).join('\n');
                fullText += pageString + '\n';
            }

            setText(fullText);

            const pdfInfo = await pdf.getMetadata();
            setTitle(pdfInfo.info.Title || 'Unknown Title');
            setAuthor(pdfInfo.info.Author || 'Unknown Author');
            setNumPages(pdf.numPages);
        };

        reader.readAsArrayBuffer(selectedFile);
    };

    // Creates a summary of the whole paper
    const summarizeText = async () => {
        try {
            setLoading(true);
            const prompt = 'Provide a concise summary of what the following research paper is about, in a maximum of 400 words in a single paragraph. \n Paper text:' + text;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const theText = await response.text();
            // const lines = theText.split('\n');
            // console.log(lines);
            // const data = [];
            // let currentSection = null;

            // lines.forEach(line => {
            //     const trimmedLine = line.trim();

            //     if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
            //         if (currentSection) {
            //             data.push(currentSection);
            //         }
            //         currentSection = {
            //             section: trimmedLine.slice(2, -2).replace('**',''),
            //             sectionText: ''
            //         };
            //     } else if (trimmedLine.startsWith('* **') && trimmedLine.endsWith('**:')) {
            //         currentSection.sectionText += `<li><strong>${trimmedLine.slice(3, -2).replace('*','')}</strong>: `;
            //     } else if (trimmedLine.startsWith('* ')) {
            //         currentSection.sectionText += `<li>${trimmedLine.slice(2).replace('*','')}</li>`;
            //     } else {
            //         currentSection.sectionText += trimmedLine.replace('*','') + ' ';
            //     }
            // });

            // if (currentSection) {
            //     data.push(currentSection);
            // }

            // // Wrap lists in <ul> tags
            // data.forEach(section => {
            //     section.sectionText = section.sectionText.replace(/<li>/g, '<ul><li>').replace(/<\/li> /g, '</li></ul> ');
            // });

            // setSections(data);
            setSummary(theText);
            const emptyArray = [];
            setSections(emptyArray);
            setLoading(false);
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    };

    // Summarizes each section of the paper
    const summarizeSections = async () => {
        try {
            setLoading(true);
            const prompt = 'Provide a section-wise summary of each section of the following research paper text. \n Paper text:' + text;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const theText = await response.text();
            const lines = theText.split('\n');
            const data = [];
            let currentSection = null;
            let isListOpen = false; // To track if a list is open

            lines.forEach(line => {
                const trimmedLine = line.trim();

                if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                    if (currentSection) {
                        if (isListOpen) {
                            currentSection.sectionText += '</ul>'; // Close any open list
                            isListOpen = false;
                        }
                        data.push(currentSection);
                    }
                    currentSection = {
                        section: trimmedLine.slice(2, -2),
                        sectionText: ''
                    };
                } else if (trimmedLine.startsWith('* **') && trimmedLine.endsWith('**:')) {
                    if (!isListOpen) {
                        currentSection.sectionText += '<ul>'; // Open a list
                        isListOpen = true;
                    }
                    currentSection.sectionText += `<li><strong>${trimmedLine.slice(3, -2)}</strong>: `;
                } else if (trimmedLine.startsWith('* ')) {
                    if (!isListOpen) {
                        currentSection.sectionText += '<ul>'; // Open a list
                        isListOpen = true;
                    }
                    currentSection.sectionText += `<li>${trimmedLine.slice(2)}</li>`;
                } else {
                    currentSection.sectionText += trimmedLine + ' ';
                }
            });

            if (currentSection) {
                if (isListOpen) {
                    currentSection.sectionText += '</ul>'; // Close any open list
                }
                data.push(currentSection);
            }

            setSections(data);
            setSummary([]);
            setLoading(false);
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    };

    // Renders each section of the summary-by-section of the paper
    const renderSections = (sections) => {
        if (!Array.isArray(sections)) {
            return null;
        }
        return sections.map((section, index) => (
            <div key={index}>
                <h3>{section.section}</h3>
                <div>{parse(section.sectionText)}</div>
            </div>
        ));
    };

    // Copies text of the summary of the whole paper to the clipboard
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Summary copied to clipboard!');
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    // Copies text of the summary-by-section of the paper
    const copySectionsToClipboard = (sections) => {
        const plainText = sections.map(section => {
            const sectionText = htmlToPlainText(section.sectionText);
            return `${section.section}\n${sectionText}`;
        }).join('\n\n');

        navigator.clipboard.writeText(plainText).then(() => {
            alert('Sections copied to clipboard!');
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    // Converts each object displayed to the screen to plain text. 
    // Used by copySectionsToClipboard
    const htmlToPlainText = (html) => {
        let tempElement = document.createElement("div");
        tempElement.innerHTML = html;

        return extractText(tempElement).trim();
    };

    // Extract text for each element
    const extractText = (element) => {
        let text = "";
        element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.nodeValue;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'UL' || node.tagName === 'OL') {
                    text += '\n';
                }
                if (node.tagName === 'LI') {
                    text += '\n- ';
                }
                if (node.tagName === 'BR') {
                    text += '\n';
                }
                text += extractText(node);
                if (node.tagName === 'P' || node.tagName === 'DIV') {
                    text += '\n';
                }
            }
        });
        return text;
    };

    return (
        <div className="container">
            <h1>PDF Summarizer</h1>
            <input type="file" onChange={onFileChange} accept=".pdf" />
            {file && (
                <div className="pdf-info">
                    <h3>PDF Information</h3>
                    <p><strong>Title:</strong> {title}</p>
                    <p><strong>Author:</strong> {author}</p>
                    <p><strong>Number of Pages:</strong> {numPages}</p>
                    <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                        <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                </div>
            )}
            {loading ? (
                <div className="loader">
                    <ProgressBar
                        visible={true}
                        height="80"
                        width="80"
                        color="#4fa94d"
                        ariaLabel="progress-bar-loading"
                        wrapperStyle={{}}
                        wrapperClass=""
                    />
                </div>
            ) : (
                <div className="buttonContainer">
                    <button className="button" onClick={summarizeText} disabled={!file}>Summarize Full Paper</button>
                    <button className="button" onClick={summarizeSections} disabled={!file}>Sectionwise Summary</button>
                </div>
            )}

            {summary.length > 0 && (
                <div className="summary">
                    <h2>Overall Summary</h2>
                    <p>{summary}</p>
                    <div className="center-copy-button">
                        <button className="copy-button" onClick={() => copyToClipboard(summary)}>Copy to Clipboard</button>
                    </div>
                </div>
            )}
            {/* TO DO - on button click navigate to separate page to render these 2*/}
            {sections.length > 0 && (
                <div className="summary">
                    {renderSections(sections)}
                    <div className="center-copy-button">
                        <button className="copy-button" onClick={() => copySectionsToClipboard(sections) }>Copy Sections to Clipboard</button>
                    </div>

                </div>
            )}
            <div className="footer">
                <p className="footer-text">Developed by
                    <a href="https://github.com/panktishah99/PaperSummarizer"
                        target="_blank" rel="noopener noreferrer"
                        style={{
                            textDecoration: 'none',
                            fontWeight: "bold"
                        }}>&nbsp;ArchiTechies</a>&nbsp;&nbsp;
                </p>
            </div>
        </div>
    );
};

export default PdfSummarizer;