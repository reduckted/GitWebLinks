#nullable enable

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace GitWebLinks;

public class Git {

    private readonly ILogger _logger;


    public Git(ILogger logger) {
        _logger = logger;
    }


    public async Task<IReadOnlyList<string>> ExecuteAsync(string root, params string[] arguments) {
        string args;


        // Handle non-ASCII characters in filenames.
        // See https://stackoverflow.com/questions/4144417/
        args = "-c core.quotepath=false " + string.Join(" ", arguments);

        await _logger.LogAsync($"Executing git {args}");

        using (Process process = new()) {
            ProcessStartInfo info;
            List<string> output;
            List<string> errors;


            info = new ProcessStartInfo {
                FileName = "git.exe",
                Arguments = args,
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            output = new List<string>();
            errors = new List<string>();

            process.StartInfo = info;
            process.Start();

            await Task.WhenAll(
                ReadStreamAsync(process.StandardOutput, output),
                ReadStreamAsync(process.StandardError, errors)
            );

            process.WaitForExit();

            if (process.ExitCode != 0) {
                throw new GitException(string.Join(Environment.NewLine, errors));
            }

            return output;
        }
    }


    private static async Task ReadStreamAsync(StreamReader stream, List<string> output) {
        while (true) {
            string line;


            line = await stream.ReadLineAsync();

            if (line is null) {
                return;
            }

            lock (output) {
                output.Add(line);
            }
        }
    }

}
