namespace GitWebLinks;

public class NullLogger : ILogger {

    public static ILogger Instance { get; } = new NullLogger();


    public Task LogAsync(string message) {
        return Task.CompletedTask;
    }

}

