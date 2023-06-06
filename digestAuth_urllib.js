import { request } from "urllib";
import { Constants } from "./util/Constants.js";
const constants = new Constants();
const params = new URLSearchParams();
params.append("cwUser", constants.params.CWUSER);
params.append("dataSource", constants.params.DATASOURCE);
params.append("filterOperator", constants.operators.SUBQUERY);
params.append("filterOperand1", "IN (SELECT WOWO_CODE FROM WORK_ORDER WHERE ROWNUM < 5)");

const options = {
    method: constants.methods.GET,
    dataType: "json",
    contentType: "json",
    digestAuth: `${constants.credentials.USERNAME}:${constants.credentials.PASSWORD}`,
    // data: { // EXEMPLE
    //     wowoUserStatus: "0",
    //     wowoEquipment: "0-U1",
    //     wowoJob: "CURA000902",
    //     wowoJobType: "COR",
    //     wowoScheduleDate: new Date(),
    //     wowoCostcentre: "F122700",
    //     wowoNotesHelper: "TEST"
    // }
}

request(`${constants.baseUrl}/workorders?${params}`, options).then(result => console.log(result)).catch(err => console.error(err));
// request(`${constants.baseUrl}/workorders?${params}`, options)
//     .then(result => console.log(result))
//     .catch(err => console.error(err));

