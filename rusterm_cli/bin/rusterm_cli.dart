import 'dart:io';
import 'package:args/args.dart';
import 'package:rusterm_cli/rusterm_ipc.dart';

void main(List<String> arguments) async {
  final parser = ArgParser()
    ..addFlag('help', abbr: 'h', help: 'Show help', negatable: false);

  // Subcommands
  parser.addCommand('ping', ArgParser()..addFlag('help', abbr: 'h', negatable: false));

  final addLocalParser = ArgParser()
    ..addOption('cols', abbr: 'c', defaultsTo: '80', help: 'Terminal columns')
    ..addOption('rows', abbr: 'r', defaultsTo: '24', help: 'Terminal rows')
    ..addOption('cwd', help: 'Working directory')
    ..addFlag('help', abbr: 'h', negatable: false);
  parser.addCommand('add-local', addLocalParser);

  final addSshParser = ArgParser()
    ..addOption('host', abbr: 'H', mandatory: true, help: 'SSH host')
    ..addOption('user', abbr: 'u', mandatory: true, help: 'SSH username')
    ..addOption('port', abbr: 'p', defaultsTo: '22', help: 'SSH port')
    ..addOption('password', help: 'SSH password')
    ..addOption('key', help: 'Private key path')
    ..addOption('passphrase', help: 'Private key passphrase')
    ..addOption('cols', abbr: 'c', defaultsTo: '80', help: 'Terminal columns')
    ..addOption('rows', abbr: 'r', defaultsTo: '24', help: 'Terminal rows')
    ..addFlag('help', abbr: 'h', negatable: false);
  parser.addCommand('add-ssh', addSshParser);

  final closeParser = ArgParser()
    ..addFlag('help', abbr: 'h', negatable: false);
  parser.addCommand('close', closeParser);

  parser.addCommand('list', ArgParser()..addFlag('help', abbr: 'h', negatable: false));

  try {
    final results = parser.parse(arguments);

    if (results['help'] as bool || results.command == null) {
      printUsage(parser);
      return;
    }

    final command = results.command!;
    final commandName = command.name;

    if (command['help'] as bool) {
      printCommandHelp(commandName!, parser);
      return;
    }

    // IPC 클라이언트 생성 및 연결
    final client = RustermIpcClient();

    try {
      await client.connect();

      // 명령어 실행
      switch (commandName) {
        case 'ping':
          await handlePing(client);
          break;

        case 'add-local':
          await handleAddLocal(client, command);
          break;

        case 'add-ssh':
          await handleAddSsh(client, command);
          break;

        case 'close':
          await handleClose(client, command);
          break;

        case 'list':
          await handleList(client);
          break;

        default:
          print('Unknown command: $commandName');
          exit(1);
      }
    } finally {
      await client.close();
    }
  } on FormatException catch (e) {
    print('Error: ${e.message}');
    print('');
    printUsage(parser);
    exit(1);
  } catch (e) {
    print('Error: $e');
    exit(1);
  }
}

void printUsage(ArgParser parser) {
  print('RusTerm IPC CLI - Control RusTerm via IPC');
  print('');
  print('Usage: rusterm_cli <command> [options]');
  print('');
  print('Commands:');
  print('  ping                 Ping the RusTerm IPC server');
  print('  add-local            Add a local terminal tab');
  print('  add-ssh              Add an SSH terminal tab');
  print('  close <tab-id>       Close a tab by ID');
  print('  list                 List all tabs');
  print('');
  print('Global options:');
  print(parser.usage);
  print('');
  print('Use "rusterm_cli <command> --help" for more information about a command.');
}

void printCommandHelp(String command, ArgParser parser) {
  final commandParser = parser.commands[command];
  if (commandParser == null) return;

  print('Usage: rusterm_cli $command [options]');
  print('');
  print('Options:');
  print(commandParser.usage);
}

Future<void> handlePing(RustermIpcClient client) async {
  print('Pinging RusTerm...');
  final response = await client.ping();
  print('✓ Pong! $response');
}

Future<void> handleAddLocal(RustermIpcClient client, ArgResults results) async {
  final cols = int.parse(results['cols'] as String);
  final rows = int.parse(results['rows'] as String);
  final cwd = results['cwd'] as String?;

  print('Adding local terminal tab...');
  final response = await client.addLocalTab(
    cols: cols,
    rows: rows,
    cwd: cwd,
  );
  print('✓ Local tab created: $response');
}

Future<void> handleAddSsh(RustermIpcClient client, ArgResults results) async {
  final host = results['host'] as String;
  final user = results['user'] as String;
  final port = int.parse(results['port'] as String);
  final password = results['password'] as String?;
  final key = results['key'] as String?;
  final passphrase = results['passphrase'] as String?;
  final cols = int.parse(results['cols'] as String);
  final rows = int.parse(results['rows'] as String);

  print('Adding SSH terminal tab...');
  final response = await client.addSshTab(
    host: host,
    username: user,
    port: port,
    password: password,
    privateKey: key,
    passphrase: passphrase,
    cols: cols,
    rows: rows,
  );
  print('✓ SSH tab created: $response');
}

Future<void> handleClose(RustermIpcClient client, ArgResults results) async {
  final args = results.rest;
  if (args.isEmpty) {
    print('Error: Tab ID required');
    print('Usage: rusterm_cli close <tab-id>');
    exit(1);
  }

  final tabId = args[0];
  print('Closing tab $tabId...');
  await client.closeTab(tabId);
  print('✓ Tab closed');
}

Future<void> handleList(RustermIpcClient client) async {
  print('Listing tabs...');
  final tabs = await client.listTabs();

  if (tabs.isEmpty) {
    print('No tabs found');
    return;
  }

  print('Found ${tabs.length} tab(s):');
  for (var i = 0; i < tabs.length; i++) {
    final tab = tabs[i];
    print('  ${i + 1}. $tab');
  }
}
