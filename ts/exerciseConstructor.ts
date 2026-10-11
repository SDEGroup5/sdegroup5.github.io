// quiz type:
// mc = multi choice
// cq = complete question (code must be html formatted in base64)

let jsonFile: any = null;
let jsonFileUrl: string = "http://localhost:8000/quiz.json";
let partsArray: part[] = new Array();

const enum choiceType {
    mc = "mc",
    cq = "cq"
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
                    break;
            }
        }
    }

    console.log(partsArray[1].mcArray, partsArray[1].cqArray);
}

buildParts();
assignQuiz();