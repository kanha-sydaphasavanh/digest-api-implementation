export class Constants {
    baseUrl = "http://SIV763:8084/ws/rest";
    
    operators = {
        EQUALS: "equals",
        DIFFERENTS: "different",
        BETWEEN: "between",
        CONTAINS: "contains",
        SUBQUERY: "subquery"
    };

    credentials = {
        USERNAME: "wsuser",
        PASSWORD: "wsuser",
        REALM: "CoswinWSRealm"
    }

    params = {
        CWUSER: "KSH",
        DATASOURCE: "DEMO8",
    }

    methods = {
        GET : "get",
        POST : "post",
        PUT : "put",
        DELETE : "delete"
    }
}