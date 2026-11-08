from rest_framework.views import exception_handler


def non_interactive_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.headers.pop('WWW-Authenticate', None)
    return response
