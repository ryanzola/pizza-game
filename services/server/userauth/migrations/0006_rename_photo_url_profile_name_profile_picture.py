# Generated by Django 4.2.6 on 2023-12-26 16:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('userauth', '0005_profile_photo_url'),
    ]

    operations = [
        migrations.RenameField(
            model_name='profile',
            old_name='photo_url',
            new_name='name',
        ),
        migrations.AddField(
            model_name='profile',
            name='picture',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ]