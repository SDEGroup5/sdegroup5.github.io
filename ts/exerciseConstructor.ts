// quiz type:
// mc = multi choice
// cq = complete question (code must be html formatted in base64)

let jsonFile: any = null;
const jsonFileUrl: string = "./../json/quiz.json";
const partsArray: part[] = new Array();

const nextButton = '<button id="nextButton" onclick="nextButtonPressed()">-></button>';
const previousButton = '<button id="previousButton" onclick="prevButtonPressed()"><-</button>';

const enum choiceType {
    mc = "mc",
    cq = "cq",
    ex = "exercise"
}

class currentPosition {
    partId: number;
    type: choiceType;
    index: number;

    constructor(partId: number, type: choiceType, index: number) {
        this.partId = partId;
        this.type = type;
        this.index = index;
    }
}

class mc {
    partId: number;
    question: string;
    answers: string[];
    rightAnswer: number;

    constructor(partId: number, question: string, answers: string[], rightAnswer: number) {
        this.partId = partId;
        this.question = question;
        this.answers = answers;
        this.rightAnswer = rightAnswer;
    }
}

class cq {
    partId: number;
    description: string;
    base64code: string;
    rightFillers: string[];

    constructor(partId: number, description: string, base64code: string, rightFillers: string[]) {
        this.partId = partId;
        this.description = description;
        this.base64code = base64code;
        this.rightFillers = rightFillers;
    }
}

class part {
    id: number;
    title: string;
    mcArray: mc[]; // Array of multi choice questions
    cqArray: cq[]; // Array of complete questions
    exerciseArray: exercise[]; //Array of exercise

    constructor(id: number, title: string, mcArray: mc[], cqArray: cq[], exerciseArray: exercise[]) {
        this.id = id;
        this.title = title;
        this.mcArray = mcArray;
        this.cqArray = cqArray;
        this.exerciseArray = exerciseArray;
    }
}

class exercise {
    partId: number;
    base64description: string;

    constructor(partId: number, base64description: string) {
        this.partId = partId;
        this.base64description = base64description;
    }
}

async function fetchAndStoreJSON(url: string) {
    let fetchResponse: Response = await fetch(url);

    if (!fetchResponse.ok) {
        return null;
    };

    jsonFile = await fetchResponse.json();

    return jsonFile;
}

async function buildParts() {
    if (jsonFile === null) {
        let fetchedObject = await fetchAndStoreJSON(jsonFileUrl);
        if (fetchedObject === null) {
            return;
        }
    }

    for (const obj of jsonFile.parts) {
        if ("id" in obj && "title" in obj) {
            partsArray[obj.id] = new part(obj.id, obj.title, new Array(), new Array(), new Array());
        }
    }
}

async function assignExercise() {
    if (jsonFile === null) {
        let fetchedObject = await fetchAndStoreJSON(jsonFileUrl);
        if (fetchedObject === null) {
            return;
        }
    }

    for (const obj of jsonFile.exercise) {

        if ("partId" in obj && partsArray[obj.partId] && "base64description" in obj) {
            partsArray[obj.partId].exerciseArray.push(new exercise(obj.partId, obj.base64description));
        }

    }
}

async function assignQuiz() {
    if (jsonFile === null) {
        let fetchedObject = await fetchAndStoreJSON(jsonFileUrl);
        if (fetchedObject === null) {
            return;
        }
    }

    for (const obj of jsonFile.quiz) {
        if ("partId" in obj && partsArray[obj.partId] && "type" in obj) {
            switch (obj.type) {
                case choiceType.mc:
                    if ("question" in obj && "answers" in obj && "rightAnswer" in obj) {
                        partsArray[obj.partId].mcArray.push(new mc(obj.partId, obj.question, obj.answers, obj.rightAnswer));
                    }
                    break;
                case choiceType.cq:
                    if ("description" in obj && "base64code" in obj && "rightFillers" in obj) {
                        partsArray[obj.partId].cqArray.push(new cq(obj.partId, obj.description, obj.base64code, obj.rightFillers));
                    }
                    break;
                default:
                    continue;
                    break;
            }
        }
    }
}

function formatPage() {
    const main = document.querySelector("main");

    if (!main) {
        return;
    }

    main.innerHTML = "{{CONTENT}}";

    const cp = loadPosition();

    let content = "";

    if (cp.index == -1 && cp.partId == -1) {
        content += 'START ' + nextButton;
    } else if (cp.index > -1 && cp.partId > -1 && cp.partId < partsArray.length) {
        let part = partsArray[cp.partId];
        content += `<h2>Part ${cp.partId + 1}</h2>`;
        switch (cp.type) {
            case choiceType.mc:
                if (part.mcArray.length == 0) {
                    nextButtonPressed();
                    return;
                }
                let mcq = part.mcArray[cp.index];
                content += `${mcq.question} <br>`;
                for (const q of mcq.answers) {
                    content += `<input type="radio" name="answer" value="${q}" id="${q}"> <label for="${q}">${q}</label><br>`;
                }
                content += '<button type="submit">Enter</button>';
                break;
            case choiceType.cq:
                if (part.cqArray.length == 0) {
                    nextButtonPressed();
                    return;
                }
                let cqq = part.cqArray[cp.index];
                content += `${cqq.description} <br> ${atob(cqq.base64code)} <br> <button type="submit">Enter</button>`;
                break;
            case choiceType.ex:
                if (part.exerciseArray.length == 0) {
                    nextButtonPressed();
                    return;
                }
                let exq = part.exerciseArray[cp.index];
                content += `${atob(exq.base64description)} <br> <button type="submit">Enter</button>`;
                break;
            default:
                break;
        }
        content += `<br> ${previousButton} ${nextButton}`;
    } else {
        cp.index = partsArray[partsArray.length - 1].exerciseArray.length;
        cp.partId = partsArray.length - 1;
        cp.type = choiceType.ex;
        savePosition(cp);
        content += 'FINISH ' + previousButton;
    }
    main.innerHTML = main.innerHTML.replace("{{CONTENT}}", content);

}

function savePosition(currentPosition: currentPosition) {
    document.cookie = `partId=${currentPosition.partId};max-age=31536000`;
    document.cookie = `type=${currentPosition.type};max-age=31536000`;
    document.cookie = `index=${currentPosition.index};max-age=31536000`;
}

function loadPosition(): currentPosition {
    let partId = -1;
    let type = choiceType.cq;
    let index = -1;

    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i].trim();

        if (cookie.startsWith('partId=')) {
            partId = parseInt(cookie.substring(7, cookie.length));
        } else if (cookie.startsWith('type=')) {
            switch (cookie.substring(5, cookie.length)) {
                case choiceType.cq:
                    type = choiceType.cq;
                    break;
                case choiceType.mc:
                    type = choiceType.mc;
                    break;
                case choiceType.ex:
                    type = choiceType.ex;
                    break;
                default:
                    continue;
                    break;
            }
        } else if (cookie.startsWith('index=')) {
            index = parseInt(cookie.substring(6, cookie.length));
        }
    }

    return new currentPosition(partId, type, index);

}

// Button handlers

function prevButtonPressed() {
    let cp = loadPosition();
    cp.index -= 1;

    if (cp.index < 0) {
        switch (cp.type) {
            case choiceType.ex:
                // Check to pass from exercise to cq
                cp.type = choiceType.cq;
                cp.index = partsArray[cp.partId].cqArray.length - 1;
                break;
            case choiceType.cq:
                // Check to pass from cq to mc
                cp.type = choiceType.mc;
                cp.index = partsArray[cp.partId].mcArray.length - 1;
                break;
            case choiceType.mc:
                // Check to pass to previous section
                cp.type = choiceType.ex;
                cp.partId -= 1;
                if (cp.partId < 0) {
                    cp.index = -1;
                    savePosition(cp);
                    formatPage();
                    return;
                }
                cp.index = partsArray[cp.partId].exerciseArray.length - 1;
                break;
            default:
                break;
        }

        // If after the switch the index is still negative, retry again until partId is 0 and choice type is mc
        if (cp.index < 0) {
            if (cp.partId == 0 && cp.type == choiceType.mc) {
                cp.index = -1;
                savePosition(cp);
                formatPage();
                return;
            } else {
                savePosition(cp);
                prevButtonPressed();
                return;
            }
        }
    }

    // If a valid position has been found, save the current position and load the page
    savePosition(cp);
    formatPage();
}

function nextButtonPressed() {
    let cp = loadPosition();

    // If parts are finished, call formatPage
    if (cp.partId > partsArray.length) {
        formatPage();
    }

    if (cp.partId == -1) {
        cp.type = choiceType.mc;
        cp.index = 0;
        cp.partId += 1;
        savePosition(cp);
        formatPage();
        return;
    }

    cp.index += 1;

    switch (cp.type) {
        case choiceType.mc:
            // Check to go to cq
            if (cp.index == partsArray[cp.partId].mcArray.length) {
                cp.type = choiceType.cq;
                cp.index = 0;
            }
            if (partsArray[cp.partId].cqArray.length == 0) {
                // If the current section has no element try again
                cp.type = choiceType.cq;
                cp.index = -1;
                savePosition(cp);
                nextButtonPressed();
                return;
            }
            break;
        case choiceType.cq:
            // Check to go to exercise
            if (cp.index == partsArray[cp.partId].cqArray.length) {
                cp.type = choiceType.ex;
                cp.index = 0;
            }
            if (partsArray[cp.partId].exerciseArray.length == 0) {
                // If the current section has no element try again
                cp.type = choiceType.ex;
                cp.index = -1;
                savePosition(cp);
                nextButtonPressed();
                return;
            }
            break;
        case choiceType.ex:
            // Check to go to next section
            if (partsArray[cp.partId].exerciseArray.length == 0 || cp.index == partsArray[cp.partId].exerciseArray.length) {
                cp.type = choiceType.mc;
                cp.index = 0;
                cp.partId += 1;
            }
            break;
        default:
            break;
    }

    savePosition(cp);
    formatPage();
}

async function main() {
    await buildParts();
    await assignQuiz();
    await assignExercise();

    formatPage();
}

main();