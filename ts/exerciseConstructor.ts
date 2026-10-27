// quiz type:
// mc = multi choice
// cq = complete question (code must be html formatted in base64)

let jsonFile: any = null;
const jsonFileUrl: string = "../json/quiz.json";
const partsArray: part[] = new Array();
const docsList: doc[] = new Array();
let isDocListPresent: boolean = false;

const nextButton = '<button id="nextButton" onclick="nextButtonPressed()"></button>';
const previousButton = '<button id="previousButton" onclick="prevButtonPressed()"></button>';
const submitButton = '<button id="submitButton" onClick="checkAnswer()">Submit</button>';

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

class doc {
    name: string;
    url: string;

    constructor(name: string, url: string) {
        this.name = name;
        this.url = url;
    }
}

class mc {
    partId: number;
    index: number;
    base64Question: string;
    answers: string[];
    rightAnswer: number;

    constructor(partId: number, index: number, base64Question: string, answers: string[], rightAnswer: number) {
        this.partId = partId;
        this.index = index;
        this.base64Question = base64Question;
        this.answers = answers;
        this.rightAnswer = rightAnswer;
    }
}

class cq {
    partId: number;
    index: number;
    description: string;
    base64code: string;
    rightFillers: string[];

    constructor(partId: number, index: number, description: string, base64code: string, rightFillers: string[]) {
        this.partId = partId;
        this.index = index;
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
    index: number;
    base64description: string;

    constructor(partId: number, index: number, base64description: string) {
        this.partId = partId;
        this.index = index;
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

    let counter: number = 0;
    let oldExPart: number = 0;

    for (const obj of jsonFile.exercise) {
        if ("partId" in obj && partsArray[obj.partId] && "base64description" in obj) {
            if (obj.partId != oldExPart) {
                counter = 0;
                oldExPart = obj.partId;
            }
            partsArray[obj.partId].exerciseArray.push(new exercise(obj.partId, counter, obj.base64description));
            counter += 1;
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

    let mcCounter: number = 0;
    let cqCounter: number = 0;
    let oldMcPart: number = 0;
    let oldCqPart: number = 0;

    for (const obj of jsonFile.quiz) {
        if ("partId" in obj && partsArray[obj.partId] && "type" in obj) {
            switch (obj.type) {
                case choiceType.mc:
                    if ("base64question" in obj && "answers" in obj && "rightAnswer" in obj) {
                        if (obj.partId != oldMcPart) {
                            mcCounter = 0;
                            oldMcPart = obj.partId;
                        }
                        partsArray[obj.partId].mcArray.push(new mc(obj.partId, mcCounter, obj.base64question, obj.answers, obj.rightAnswer));
                        mcCounter += 1;
                    }
                    break;
                case choiceType.cq:
                    if ("description" in obj && "base64code" in obj && "rightFillers" in obj) {
                        if (obj.partId != oldCqPart) {
                            cqCounter = 0;
                            oldCqPart = obj.partId;
                        }
                        partsArray[obj.partId].cqArray.push(new cq(obj.partId, cqCounter, obj.description, obj.base64code, obj.rightFillers));
                        cqCounter += 1;
                    }
                    break;
                default:
                    continue;
                    break;
            }
        }
    }
}

async function retrieveDocs() {
    const docsListRes = await fetch("https://api.github.com/repos/sdegroup5/docs/releases/latest");

    if (!docsListRes.ok) {
        return;
    }

    const docsListJson = await docsListRes.json();

    if (!("assets" in docsListJson) || !(Array.isArray(docsListJson["assets"]))) {
        return;
    }

    for (const asset of docsListJson["assets"]) {
        if (!("name" in asset) || !("browser_download_url" in asset)) {
            continue;
        }
        docsList.push(new doc(asset["name"], asset["browser_download_url"]));
    }
}

function buildLabMap() {
    const mapListUl: HTMLElement | null = document.getElementById("labMapList");

    if (mapListUl === null || !(mapListUl instanceof HTMLUListElement)) {
        return;
    }

    mapListUl.innerHTML = "";

    let partCounter: number = 1;
    const cp = loadPosition();

    for (const part of partsArray) {
        const item = document.createElement("li");
        item.setAttribute("class", "labMapPartTitle");

        item.innerHTML = `Part ${partCounter}`;
        mapListUl.appendChild(item);

        let exCounter: number = 1;
        for (const mc of part.mcArray) {
            const item = document.createElement("li");
            const link = document.createElement("a");

            item.innerHTML = "&emsp;";
            link.href = "#";
            link.innerHTML = `Choice ${exCounter}`;

            link.addEventListener("click", (event) => {
                event.preventDefault();
                savePosition(new currentPosition(mc.partId, choiceType.mc, mc.index));
                formatPage();
            });

            item.appendChild(link);
            mapListUl.appendChild(item);

            if (cp.partId == part.id && cp.type == choiceType.mc && cp.index == exCounter - 1) {
                item.setAttribute("id", "current");
            }

            exCounter += 1;
        }

        exCounter = 1;
        for (const cq of part.cqArray) {
            const item = document.createElement("li");
            const link = document.createElement("a");

            item.innerHTML = "&emsp;";
            link.href = "#";
            link.innerHTML = `Complete ${exCounter}`;

            link.addEventListener("click", (event) => {
                event.preventDefault();
                savePosition(new currentPosition(cq.partId, choiceType.cq, cq.index));
                formatPage();
            });

            item.appendChild(link);
            mapListUl.appendChild(item);

            if (cp.partId == part.id && cp.type == choiceType.cq && cp.index == exCounter - 1) {
                item.setAttribute("id", "current");
            }

            exCounter += 1;
        }

        exCounter = 1;
        for (const ex of part.exerciseArray) {
            const item = document.createElement("li");
            const link = document.createElement("a");

            link.href = "#";
            item.innerHTML = "&emsp;";
            link.innerHTML = `Exercise ${exCounter}`;

            link.addEventListener("click", (event) => {
                event.preventDefault();
                savePosition(new currentPosition(ex.partId, choiceType.ex, ex.index));
                formatPage();
            });

            item.appendChild(link);
            mapListUl.appendChild(item);

            if (cp.partId == part.id && cp.type == choiceType.ex && cp.index == exCounter - 1) {
                item.setAttribute("id", "current");
            }

            exCounter += 1;
        }

        partCounter += 1;
    }
}

async function formatPage() {
    // Create docs list
    if (!isDocListPresent) {
        docsList.splice(0, docsList.length);

        const docsListUl: HTMLElement | null = document.getElementById("resList");

        if (docsList === null || !(docsListUl instanceof HTMLUListElement)) {
            return;
        }

        await retrieveDocs();

        for (const doc of docsList) {
            const item = document.createElement("li");

            item.innerHTML = `<a href="${doc.url}" target="_blank">${doc.name}</a>`;

            docsListUl.appendChild(item);
        }

        isDocListPresent = true;
    }

    // Create the page
    const ct: HTMLElement | null = document.getElementById("mainContentDiv");

    if (ct === null || !(ct instanceof HTMLDivElement)) {
        return;
    }

    ct.innerHTML = "{{CONTENT}}";

    const cp = loadPosition();

    let content = "";

    if (cp.index == -1 && cp.partId == -1) {
        content += '<p>Welcome to the 5th lab of the Service Design and Engineering course @UniTn</p><p> Press the button below to start. Please wait instruction before proceeding across the various parts</p> ' + '<div id = "navMenu">' + nextButton + '</div>';
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
                content += `${atob(mcq.base64Question)}`;
                for (const q of mcq.answers) {
                    content += `<div class="radioDiv"><input type="radio" name="answer" value="${q}" id="${q}"> <label for="${q}" id="${q}label">${q}</label></div>`;
                }
                break;
            case choiceType.cq:
                if (part.cqArray.length == 0) {
                    nextButtonPressed();
                    return;
                }
                let cqq = part.cqArray[cp.index];
                content += `<strong>${cqq.description}</strong>${atob(cqq.base64code)} <br>`;
                break;
            case choiceType.ex:
                if (part.exerciseArray.length == 0) {
                    nextButtonPressed();
                    return;
                }
                let exq = part.exerciseArray[cp.index];
                content += `${atob(exq.base64description)} <br>`;
                break;
            default:
                break;
        }
        if (cp.type != choiceType.ex) {
            content += `${submitButton}`;
        }
        content += `<div id="navMenu">${previousButton} ${nextButton}</div>`;
    } else {
        cp.index = -1;
        cp.partId = -1;
        cp.type = choiceType.mc;
        savePosition(cp);
        content += `
        <p>Thank you for your attention!</p>
        <br>
        <div class="teamUserDiv" id="teamUserDiv0">
                <a href="https://github.com/LorenzoCaraffini" class="teamUserLink">
                    <img src="https://avatars.githubusercontent.com/u/161510632?s=70&v=4">
                    <p class="username">LorenzoCaraffini</p>
                </a>
                <a href="https://github.com/FilizZPalm" class="teamUserLink">
                    <img src="https://avatars.githubusercontent.com/u/150455831?s=70&v=4">
                    <p class="username">FilizZPalm</p>
                </a>
                <a href="https://github.com/ozneroL541" class="teamUserLink">
                    <img src="https://avatars.githubusercontent.com/u/117105676?s=70&v=4">
                    <p class="username">ozneroL541</p>
                </a>
        </div>
        <div class="teamUserDiv" id="teamUserDiv1">
                <a href="https://github.com/FireStoat3" class="teamUserLink">
                    <img src="https://avatars.githubusercontent.com/u/161834755?s=64&v=4">
                    <p class="username">FireStoat3</p>
                </a>
                <a href="https://github.com/Oziator" class="teamUserLink">
                    <img src="https://avatars.githubusercontent.com/u/89981093?s=70&v=4">
                    <p class="username">Oziator</p>
                </a>
        </div>
        `;
    }
    ct.innerHTML = ct.innerHTML.replace("{{CONTENT}}", content);

    buildLabMap();

}

function checkAnswer() {
    const cp = loadPosition();
    const submitBtn = document.getElementById("submitButton");
    let par = document.getElementById("result");

    if (par) {
        par.remove();
    }

    par = document.createElement("p");
    par.setAttribute("id", "result");

    switch (cp.type) {
        case choiceType.mc:
            {
                const rightAnswer = partsArray[cp.partId].mcArray[cp.index].rightAnswer;
                const possibleAnswers = partsArray[cp.partId].mcArray[cp.index].answers;
                let index = 0;

                for (const option of possibleAnswers) {
                    let choice = document.getElementById(option);
                    if (!choice || !("checked" in choice) || !choice.checked) {
                        index += 1;
                        continue;
                    }
                    if (index == rightAnswer) {
                        par.innerText = "OK";

                        break;
                    } else {
                        par.innerText = "WRONG";
                        break;
                    }
                }
            }
            break;
        case choiceType.cq:
            {
                const fillers = document.querySelectorAll('input[type="text"]');
                const rightFillers = partsArray[cp.partId].cqArray[cp.index].rightFillers;
                let index = 0;

                for (const f of fillers) {
                    if (!("value" in f)) {
                        continue;
                    }

                    if (f.value != rightFillers[index]) {
                        par.innerText = "WRONG";
                        break;
                    }

                    index += 1;
                }

                if (par.innerText == "") {
                    par.innerText = "OK";
                }
            }
            break;
        case choiceType.ex:
            break;
        default:
            break;
    }

    if (submitBtn) {
        submitBtn.after(par);
    }

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

function copyCommand(event: Event,link: HTMLLinkElement) {
    event.preventDefault();

    const parent = link.closest('div');

    if(parent===null) {
        return
    }

    const code = parent.querySelector('p');

    if (code==null) {
        return null
    }

    navigator.clipboard.writeText(code.innerText).then(()=>{
            const alert: HTMLElement | null = document.getElementById("copyAlertDiv")

            if(alert==null) {
                return
            }

            alert.style = "display: block"

            setTimeout(()=>{
               alert.style = "display: none" 
            },2000)
        }
        )

}

async function main() {
    await buildParts();
    await assignQuiz();
    await assignExercise();

    formatPage();
}

main();