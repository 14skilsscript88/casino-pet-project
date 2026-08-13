from django.shortcuts import render


def entry_point(request):
    return render(request, 'entry.html')


def error_400(request, exception):
    return render(request, "error.html", {"message": str(exception)}, status=400)


def error_403(request, exception):
    return render(request, "error.html", {"message": str(exception)}, status=403)


def error_404(request, exception="Page not found"):
    return render(request, "error.html", {"message": str(exception)}, status=404)


def error_500(request):
    return render(request, "error.html", {"message": "Server error"}, status=500)
