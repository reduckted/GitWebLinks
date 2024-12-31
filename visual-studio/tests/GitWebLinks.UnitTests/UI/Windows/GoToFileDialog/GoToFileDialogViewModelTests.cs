using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Imaging;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.Threading;
using NSubstitute;
using StreamJsonRpc;
using System.Windows;

namespace GitWebLinks;

public sealed class GoToFileDialogViewModelTests {

    public class UrlProperty : TestBase {

        [Theory]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("test")]
        [InlineData("ftp://example.com")]
        public void DoesNotUseTheClipboardTextAsTheInitialValueWhenTextIsNotUrl(string text) {
            Clipboard.GetText().Returns(text);

            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                Assert.Equal("", vm.Url);
            }
        }


        [Theory]
        [InlineData("http://example.com")]
        [InlineData("https://example.com")]
        [InlineData("  https://example.com  ")]
        public void UsesTheClipboardTextAsTheInitialValueWhenTextIsUrl(string text) {
            Clipboard.GetText().Returns(text);

            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                Assert.Equal(text.Trim(), vm.Url);
            }
        }

    }


    public class TargetsProperty : TestBase {

        public TargetsProperty() {
            RepositoryFinder.FindRepositoriesAsync(Arg.Any<string>()).Returns(
                new[] {
                    new Repository(
                        RepositoryRoot,
                        new Remote("origin", ["https://example.com"])
                    )
                }.AsAsyncEnumerable()
            );
        }


        [Fact]
        public async Task UpdatesWhenUrlIsChanged() {
            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                FileTargetListItem target;
                string firstFileName;
                string secondFileName;


                Assert.Empty(vm.Targets);
                Assert.Equal(Visibility.Visible, vm.NoTargetsVisibility);

                firstFileName = CreateFile(@"Repository\Path\To\File.txt");

                LinkHandlerProvider.GetUrlInfoAsync(Arg.Any<string>()).Returns([
                    new UrlInfo(
                        firstFileName,
                        new StaticServer("https://example.com", null, null),
                        new PartialSelectedRange(null,null,null,null)
                    )
                ]);

                vm.Url = "https://example.com";
                await Task.Yield();

                target = Assert.Single(vm.Targets);
                Assert.Equal("File.txt", target.Name);
                Assert.Equal(@"Path\To\File.txt", target.RelativePath);
                Assert.Equal(firstFileName, target.File.FileName);

                Assert.Equal(Visibility.Collapsed, vm.NoTargetsVisibility);

                secondFileName = CreateFile(@"Repository\Some\Other\File.txt");

                LinkHandlerProvider.GetUrlInfoAsync(Arg.Any<string>()).Returns([
                   new UrlInfo(
                        firstFileName,
                        new StaticServer("https://example.com", null, null),
                        new PartialSelectedRange(null, null, null, null)
                    ),
                    new UrlInfo(
                        secondFileName,
                        new StaticServer("https://example.com", null, null),
                        new PartialSelectedRange(1, 2, 3, 4)
                    )
               ]);

                vm.Url = "https://example.com/other";
                await Task.Yield();

                Assert.Collection(
                    vm.Targets,
                    (target) => {
                        Assert.Equal("File.txt", target.Name);
                        Assert.Equal(@"Path\To\File.txt", target.RelativePath);
                        Assert.Equal(firstFileName, target.File.FileName);
                    },
                    (target) => {
                        Assert.Equal("File.txt", target.Name);
                        Assert.Equal(@"Some\Other\File.txt", target.RelativePath);
                        Assert.Equal(secondFileName, target.File.FileName);
                    }
                );
            }
        }


        [Fact]
        public async Task IsPopulatedWhenUrlIsInitiallyPopulated() {
            Clipboard.GetText().Returns("https://example.com");

            LinkHandlerProvider.GetUrlInfoAsync(Arg.Any<string>()).Returns([
                new UrlInfo(
                        CreateFile(@"Repository\Path\To\File.txt"),
                    new StaticServer("https://example.com", null, null),
                    new PartialSelectedRange(null,null,null,null)
                )
            ]);

            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                await Task.Yield();
                Assert.Single(vm.Targets);
            }
        }


        [Fact]
        public async Task IncludesMatchingFilesThatExistWhenRemoteDoesNotMatch() {
            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                FileTargetListItem target;
                string fileName;


                Assert.Empty(vm.Targets);
                Assert.Equal(Visibility.Visible, vm.NoTargetsVisibility);

                fileName = CreateFile(@"Repository\File.txt");

                LinkHandlerProvider.GetUrlInfoAsync(Arg.Any<string>()).Returns([
                    new UrlInfo(
                        fileName,
                        new StaticServer("https://that.com", null, null),
                        new PartialSelectedRange(null,null,null,null)
                    )
                ]);

                vm.Url = "https://that.com";
                await Task.Yield();

                target = Assert.Single(vm.Targets);
                Assert.Equal("File.txt", target.Name);
            }
        }


        [Fact]
        public async Task ExcludesMatchingFilesThatDoNotExistWhenRemoteDoesNotMatch() {
            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                Assert.Empty(vm.Targets);
                Assert.Equal(Visibility.Visible, vm.NoTargetsVisibility);

                LinkHandlerProvider.GetUrlInfoAsync(Arg.Any<string>()).Returns([
                    new UrlInfo(
                        Path.Combine(RepositoryRoot,"File.txt"),
                        new StaticServer("https://that.com", null, null),
                        new PartialSelectedRange(null,null,null,null)
                    )
                ]);

                vm.Url = "https://that.com";
                await Task.Yield();

                Assert.Empty(vm.Targets);
            }
        }

    }


    public class SelectedTargetProperty : TestBase {

        public SelectedTargetProperty() {
            RepositoryFinder.FindRepositoriesAsync(Arg.Any<string>()).Returns(
                new[] {
                    new Repository(
                        RepositoryRoot,
                        new Remote("origin", ["https://example.com"])
                    )
                }.AsAsyncEnumerable()
            );
        }


        [Fact]
        public async Task IsSetToFirstTargetWhenTargetsChange() {
            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                Assert.Null(vm.SelectedTarget);

                LinkHandlerProvider.GetUrlInfoAsync(Arg.Any<string>()).Returns([
                    new UrlInfo(
                        CreateFile(@"Repository\Some\Other\File.txt"),
                        new StaticServer("https://example.com", null, null),
                        new PartialSelectedRange(null, null, null, null)
                    ),
                    new UrlInfo(
                        CreateFile(@"Repository\Some\Other\File.txt"),
                        new StaticServer("https://example.com", null, null),
                        new PartialSelectedRange(1, 2, 3, 4)
                    )
                ]);

                vm.Url = "https://example.com/1";
                await Task.Yield();

                Assert.Same(vm.Targets[0], vm.SelectedTarget);

                vm.SelectedTarget = vm.Targets[1];

                LinkHandlerProvider.GetUrlInfoAsync(Arg.Any<string>()).Returns([
                    new UrlInfo(
                        CreateFile(@"Repository\Some\Other\File.txt"),
                        new StaticServer("https://example.com", null, null),
                        new PartialSelectedRange(null, null, null, null)
                    ),
                    new UrlInfo(
                        CreateFile(@"Repository\Some\Other\File.txt"),
                        new StaticServer("https://example.com", null, null),
                        new PartialSelectedRange(1, 2, 3, 4)
                    )
                ]);

                vm.Url = "https://example.com/2";
                await Task.Yield();

                Assert.Same(vm.Targets[0], vm.SelectedTarget);
            }
        }

    }


    public class SelectTargetCommandProperty : TestBase {

        [Fact]
        public void DoesNothingWhenTargetIsNull() {
            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                vm.SelectTargetCommand.Execute(null);

                Assert.Null(vm.SelectedTarget);
                Assert.Null(vm.DialogResult);
            }
        }


        [Fact]
        public void SelectsTargetAndSetsDialogResultWhenTargetIsNotNull() {
            RepositoryFinder.FindRepositoriesAsync(Arg.Any<string>()).Returns(
                new[] {
                    new Repository(
                        RepositoryRoot,
                        new Remote("origin", ["https://example.com"])
                    )
                }.AsAsyncEnumerable()
            );

            using (GoToFileDialogViewModel vm = CreateViewModel()) {
                FileTargetListItem target;


                target = new FileTargetListItem(
                    new FileTarget(
                        Path.Combine(RepositoryRoot, "File.txt"),
                        new PartialSelectedRange(null, null, null, null)
                    ),
                    "File.txt",
                    KnownMonikers.Abbreviation
                );

                vm.SelectTargetCommand.Execute(target);

                Assert.Same(target, vm.SelectedTarget);
                Assert.True(vm.DialogResult);
            }
        }

    }


    public abstract class TestBase : DirectoryTestBase {

        private readonly JoinableTaskContext _joinableTaskContext = new();


        protected TestBase() {
            _joinableTaskContext = new JoinableTaskContext();
            LinkHandlerProvider = Substitute.For<ILinkHandlerProvider>();
            RepositoryFinder = Substitute.For<IRepositoryFinder>();
            Clipboard = Substitute.For<IClipboard>();
            Solution = Substitute.For<IVsSolution>();
            ImageService = Substitute.For<IVsImageService2>();

            RepositoryRoot = CreateDirectory("Repository");

            Solution
                .GetSolutionInfo(out Arg.Any<string>(), out Arg.Any<string>(), out Arg.Any<string>())
                .Returns((info) => {
                    info[0] = RepositoryRoot;
                    info[1] = Path.Combine(RepositoryRoot, "Solution.sln");
                    info[2] = Path.Combine(RepositoryRoot, "Solution.sln.user");
                    return VSConstants.S_OK;
                });
        }


        public string RepositoryRoot { get; }


        protected ILinkHandlerProvider LinkHandlerProvider { get; }


        protected IRepositoryFinder RepositoryFinder { get; }


        protected IClipboard Clipboard { get; }


        protected IVsSolution Solution { get; }


        protected IVsImageService2 ImageService { get; }


        protected GoToFileDialogViewModel CreateViewModel() {
            return new GoToFileDialogViewModel(
                LinkHandlerProvider,
                RepositoryFinder,
                Clipboard,
                Solution,
                ImageService,
                _joinableTaskContext.Factory,
                Substitute.For<ILogger>()
            );
        }


        protected override void Dispose(bool disposing) {
            _joinableTaskContext.Dispose();
            base.Dispose(disposing);
        }

    }

}
