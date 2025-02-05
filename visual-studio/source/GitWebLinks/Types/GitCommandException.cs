#nullable enable

using System;
using System.Runtime.Serialization;

namespace GitWebLinks;

[Serializable]
public class GitCommandException : Exception {

    public GitCommandException(string message) : base(message) { }


    protected GitCommandException(SerializationInfo info, StreamingContext context) : base(info, context) { }

}
