Authentication
OAuth2 Authentication
Instead of HTTP Basic Authentication, you may use OAuth2 to authenticate to the EZ Texting API.

Create a Token
First you must create a token:

Create Token

POST https://a.eztexting.com/v1/tokens/create
{
  "appKey": "username",
  "appSecret": "password"
}
You should get the following in return:

Create Token Return

200 OK
{
  "accessToken":"1ede080e0c013c03ad0fedc3bcee3c09",
  "refreshToken":"d18a92f15a1ffd76ef598c0ee1597a0",
  "expiresInSeconds":5400
}
Using a Token
Call any API. Include the following in the header:

Token Use

Authorization: Bearer <accessToken>
For example,

Token Use Example

Authorization: Bearer 1ede080e0c013c03ad0fedc3bcee3c09
If the Token is still valid, the API call will execute as intended.

If the Token is expired, you will get a 401 response code and will need to refresh the token. Refresh tokens last for 60 days.

Refreshing a Token
Request example:

Refresh Token Request

POST https://a.eztexting.com/v1/tokens/refresh
{
  "refreshToken": "d18a92f15a1ffd76ef598c0ee1597a0"
}
Response example:

Refresh Token Response

200 OK
{
  "accessToken":"001b11ef6d767e0b86a7f40dff585851",
  "refreshToken":"5b57e5a49cea506607ff4451a1bf8eba",
  "expiresInSeconds":5400
}
You can now use the new accessToken to make API calls until it expires, and the new refreshToken to again generate a fresh accessToken and refreshToken pair. You can repeat the refresh token process as many times as needed.

Immediately Revoking Both Access Token and Refresh Token
Request example

Revoke Tokens Request

POST https://a.eztexting.com/v1/tokens/revoke
{
  "token": "5b57e5a49cea506607ff4451a1bf8eba",
  "type": "REFRESH_TOKEN". // or ACCESS_TOKEN
}
Response example

Revoke Tokens Response

200 OK
HTTP Basic Authentication
The EZ Texting API supports either HTTP Basic Authentication or OAuth2 Bearer Token to verify the user of an endpoint.

To authenticate to the EZ Texting API, you will use the same username/password pair you use to sign in to the user interface. To use HTTP Basic Authentication, an Authorization header must be sent.

Example of credentials to authenticate to the API:

Credentials

Username: janine@speedsports.com
Password: c2d77eec4aa3e224
The header that the user sends will look like this:

Text

Authorization: Basic YTYzNDNjYzRlZGQ2OmMyZDc3ZWVjNGFhM2UyMjQ=
NOTE: Authentication credentials should be base64 encoded.

That is all that is needed to authenticate to the EZ Texting API. Here are a few examples to get you started.

C#
C# Example

public void SetBasicAuthHeader(WebRequest req, String userName, String userPassword)
{
	string authInfo = userName + ":" + userPassword;
	authInfo = Convert.ToBase64String(Encoding.Default.GetBytes(authInfo));
	req.Headers["Authorization"] = "Basic " + authInfo;
}
Java
Java Example

HttpClient client = HttpClientBuilder.create().build();
HttpGet request = new HttpGet("https://a.eztexting.com/v1/contacts/phoneNumber");
String authHeader = "Basic " + new BASE64Encoder().encode(username + ":" + password);
request.addHeader(HttpHeaders.AUTHORIZATION, authHeader);
HttpResponse response = client.execute(request);
JavaScript, using jQuery
JavaScript Example

<script type="text/javascript"> 
function make_base_auth(username, password) 
{ var tok = username + ':' + password; var hash = btoa(tok); return "Basic " + hash; } 
$('#cfTest').click(function(){ 
	$.ajax({ 
		type: "GET", 
		dataType: "xml", 
		beforeSend: function (xhr) 
		{ xhr.setRequestHeader('Authorization', make_base_auth('YourUserName', 'YourPassword')); } 
		, 
		url: "https://a.eztexting.com/v1/contacts/phoneNumber", 
		success: function(data) 
		{ alert(data); } 
	}); 
}); 
</script>
PHP, using cURL
PHP Example

$authentication = 'Authorization: Basic '.base64_encode("$username:$password");
$http = curl_init($url);
curl_setopt($http, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($http, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($http, CURLOPT_RETURNTRANSFER, true);
curl_setopt($http, CURLOPT_URL, $url);
curl_setopt($http, CURLOPT_POSTFIELDS, http_build_query($params));
curl_setopt($http, CURLOPT_HTTPHEADER, array('Content-Type: application/json', $authentication));
Updated 10 months ago

What’s Next
Errors
Did this page help you?



Rate Limits
By default, the maximum number of API calls is set to 200 requests per minute. We find that the majority of our API customers function comfortably within this range.

If you exceed this limit you will receive a 429 HTTP response code. You will also receive a response header named "X-Rate-Limit-Retry-After-Milliseconds" indicating how long you need to wait before retrying the request.

Updated 10 months ago

What’s Next
Webhooks
Did this page help you?


Errors
The EZ Texting Developers' API uses standard HTTP response codes for responses. These HTTP codes indicate whether or not an API operation was successful.

Status Codes in the 200s range are the desired response codes.

Codes in the 400s range detail all of the errors an EZ Texting Developer could encounter while using the API. Bad Request, Rate Limit Reached, and Unauthorized are some of the responses in the 400s block.

Codes in the 500s range are error responses from the EZ Texting system. If an error occurred anywhere in the execution of a resource, and this error was not due to user input, a 500 response will be returned with a corresponding JSON error body. That body will contain a message detailing what went wrong.

The JSON error response body
JSON

{
    "status": 400,
    "title": "Malformed Request",
    "detail": "The request you made was malformed",
    "errors": [
        {
            "title": "Sorting Failure",
            "message": "The sort direction query string is required but was missing"
        }      
    ]
}
HTTP Response Codes
Response Code

Meaning

200

OK - Everything went as planned.

201

CREATED - The request has been fulfilled and has resulted in one or more new resources being created.

204

NO CONTENT - Request fulfilled, but no body.

400

BAD REQUEST - The request contained invalid data.

401

UNAUTHORIZED - Authorization header is missing, invalid or expired.

403

FORBIDDEN - Insufficient permissions.

404

NOT FOUND - The resource requested does not exist.

415

UNSUPPORTED MEDIA TYPE - The request has a media type which the resource does not support.

429

TOO MANY REQUESTS - Too many requests were sent within a certain time frame (see Rate Limits).

500

INTERNAL ERROR - We had an error! Sorry about that.

Updated 10 months ago

What’s Next
Pagination
Did this page help you?



Pagination
Size Parameter
By default, list endpoints return a maximum of 20 records per page. You can change the number of records on a per-request basis, by passing a size parameter in the request URL parameters. The supported values for size are: 10, 20, 50, 100 and 200.

HTTP

https://a.eztexting.com/v1/conversations?size=50
Page Parameter
When the response exceeds the size value, you can paginate through the records by increasing the page parameter with each iteration.

HTTP

https://a.eztexting.com/v1/conversations?size=50&page=2
The above example will return 50 records, beginning with record 51 (page 2).

Page Response Structure
Each paged response returns content data elements as well as some paging context.

Consider the following example, where we set the page size to 10:

cURL

curl "https://a.eztexting.com/v1/conversations?size=10"
JSON

{
  "content" : {
  	... data ...
  },
  "pageable":{
    "pageNumber": 0,
    "pageSize": 10,
    "offset": 0,
  },
  "totalPages": 5,
  "totalElements": 50,
  "numberOfElements": 10,
  "last": false,
  "first": true
}
The following example shows what happens when we fetch the next page:

cURL

curl "https://a.eztexting.com/v1/conversations?page=1&size=10"
JSON

{
  "content" : {
	... data ...
  },
  "pageable":{
    "pageNumber": 1,
    "pageSize": 10,
    "offset": 10,
  },
  "totalPages": 5,
  "totalElements": 50,
  "numberOfElements": 10,
  "last": false,
  "first": false
}
Sort Parameter
To have your results sorted on a particular property, add a sort parameter to the request URL, with the name of the property on which you want to sort the results. You can control the direction of the sort by appending a comma (,) to the the property name plus either asc or desc.

cURL

curl -v "https://a.eztexting.com/v1/conversations?sort=campaignId,desc"
Updated 10 months ago

What’s Next
Rate Limits
Did this page help you?



Webhooks
Webhooks are a system of automated notifications indicating that an event has occurred in the EZ Texting system. Rather than requiring you to pull information via our API, webhooks push information to your destination when important events occur. Resource notifications are delivered via HTTP POST to a destination endpoint on your server and are sent based on the events you choose (see Webhooks). We recommend using SSL for webhook endpoints.

List of resources and events supporting webhooks:

inbound_text.received keyword.opt_in

After you verify your listener, subscribe it to either or both events. Finally, monitor the notifications that your listener receives when events occur.

JSON webhook postback example, for an inbound text received
Text

{
"id":"123",
"type": "inbound_text.received",
"fromNumber:"14243798239",
"toNumber":"14243798231",
"message":"test message",
"received":"2020-03-06T10:31:18.724Z",
"optIn": false,
"optOut": false
}
JSON webhook postback example, for a keyword opt-in
Text

{
"id":"123", 
"type": "keyword.opt_in",
"fromNumber:"14243798239",
"toNumber:"313131",
"keyword":"TESTKEY",
"received":"2020-03-06T10:31:18.724Z"
}
Authenticating Webhook Requests
EZ Texting webhooks can optionally include a secret token that, if included, is used as a secret key to create a HmacSHA1 hash of the JSON payload, returned in an 'X-Signature' header. This header can then be used to verify the callback POST is coming from EZ Texting. Note that verification via IP whitelisting is not feasible, as our system is based on a dynamic cloud infrastructure so the IP addresses of our servers may change dynamically without notice.

Verifying Request Signature
Java

import java.security.SignatureException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.codec.binary.Base64;

public class ApiRequestVerifier {

    public String getHmacSignature(String data, String key) throws SignatureException {
        String result;
        SecretKeySpec signingKey = new SecretKeySpec(key.getBytes(), "HmacSHA1");
        Mac mac;
        try {
            mac = Mac.getInstance("HmacSHA1");
            mac.init(signingKey);
            byte[] rawHmac = mac.doFinal(data.getBytes());
            result = Base64.encodeBase64String(rawHmac).trim();
        } catch (Exception e) {
            throw new SignatureException("Failed to generate HMAC : " + e.getMessage());
        }
        return result;
    }
}

// then check signature in listener code
// String data = "{\"name\":\"test webhook\", \"callback\":\"sms:eztexting\"}";
// String secret = "mysecrets"; 
// Assert.assertEquals("v14pF7d5C1+CHNIEWlg+sw9v0Xg=", new ApiRequestVerifier().getHmacSignature(data, secret));
Updated 4 months ago

Pagination
Legacy Migration Guide
Did this page help you?



Features
Massive Scale, Minimum Cost
Sending to 1 contact? 1 million? EZ Texting ensures your messages are delivered quickly and efficiently at an amazing value.

Flexible Engagement
Engage your customers where they are and how they prefer using EZ Texting's robust array of SMS and features.

Expert Assistance 24/7
Run into a roadblock? Contact us 24/7 via our support page and get the answers to your questions when you need them.

Sign Up to Start Up in minutes
Customized developer experience geared towards getting you up and running in minutes.

Compliance Out of the Box
We’ve packed our software with compliance solutions to ensure that you can focus on building your applications and let us handle the nitty gritty.

More Feature, No-stack
Campaign management, scheduling controls and much more means that we’ll do the heavy lifting so that your code stays simple.



Getting Started
This page will help you get started with the EZ Texting API

The EZ Texting Developers' API is built from the ground up as a REST API. It includes easy to understand resource URLs, extensive features and functionality, and adherence to industry practices. Using many HTTP standards and features, the API can be consumed by any HTTP client, and no third-party SDKs are required. JSON responses will be returned from all API endpoints.

API Docs.
Features
Learn

Updated 10 months ago

What’s Next
Authentication


https://developers.eztexting.com/reference/list_8-1