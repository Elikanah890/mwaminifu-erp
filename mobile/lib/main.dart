import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app/app.dart';
import 'core/settings/locale_settings.dart';

/// Decodes the app logo into the image cache before the first frame so the
/// login screen and dashboard never pay the decode cost on the UI thread.
Future<void> _warmUpImages() async {
  final provider = const AssetImage('assets/images/mwaminifu-logo.jpg');
  final completer = Completer<void>();
  final stream = provider.resolve(const ImageConfiguration());
  void onImage(ImageInfo info, bool sync) {
    if (!completer.isCompleted) completer.complete();
  }

  void onError(Object exception, StackTrace? stackTrace) {
    if (!completer.isCompleted) completer.complete();
  }

  final listener = ImageStreamListener(onImage, onError: onError);
  stream.addListener(listener);
  await completer.future;
  stream.removeListener(listener);
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocaleSettings.instance.load();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  await _warmUpImages();
  runApp(const MwaminifuApp());
}
