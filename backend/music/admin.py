from django.contrib import admin
from music.models import Album, Genre, ListeningHistory, StreamEvent, Track

admin.site.register(Genre)
admin.site.register(Album)
admin.site.register(Track)
admin.site.register(StreamEvent)
admin.site.register(ListeningHistory)
